import * as Bluebird from 'bluebird'
import redis, { Queue } from 'redis'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import * as transaction from 'lib/transaction'
import { InOut, generateMultiSend, generateStdTx } from 'lib/msg'
import * as CryptoJS from 'crypto-js'

const terraDB = level(config.db.terra.path)

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

let args
const concurrency = 20
const TERRA_QUEUE_NAME = 'lp:terra:queue'
const SEND_QUEUE_NAME = 'lp:terra:send'

interface Value {
  id: string
  denom: string
  userId: string
  merchantId: string
  amount: string
  at: string
}

let lpKey
let lpAccount

async function getKeys(values) {
  // Get or create keys from keystore
  const keys = await Bluebird.map(
    values,
    ({ userId }) => {
      const password = CryptoJS.SHA256(userId)

      return keystore.get(terraDB, userId, password).catch(() => {
        console.info(`created key for ${userId}`)
        return keystore.create(terraDB, 'terra', userId, password)
      })
    },
    { concurrency }
  )

  return keys
}

async function batchQueue() {
  // 최대 99개까지 MultiSend하므로 (0번은 lp wallet)
  const candidateValues: Value[] = await Queue.peek(TERRA_QUEUE_NAME, args.sigLimit)
  const userIdSet: Set<string> = new Set()
  let sliceIndex = 0

  // 같은 키로 MultiSend를 하지 않아야 하기 때문에 이미 있는 userId가 나올 경우 짤라준다.
  for (let i = 0; i < candidateValues.length; i += 1) {
    if (userIdSet.has(candidateValues[i].userId)) break
    userIdSet.add(candidateValues[i].userId)
    sliceIndex += 1
  }

  const values = candidateValues.slice(0, sliceIndex)

  if (!values.length) {
    return
  }

  // Get LP key and query account for account_number and sequence
  const keys = await getKeys(values)

  // 순서대로 처리해야 하기 때문에 실패 가능성에 대비해 (multi)send queue에 다시 넣는다
  await queueSendToUsers()
  await queueSendToLP()

  // 성공. 큐에서 삭제
  await Queue.trim(TERRA_QUEUE_NAME, values.length)

  async function queueSendToUsers() {
    const inputs: InOut[] = values.map(
      ({ denom, amount }): InOut => ({
        address: lpKey.address,
        coins: [{ denom, amount }]
      })
    )

    const outputs: InOut[] = values.map(
      ({ denom, amount }, index): InOut => ({
        address: keys[index].address,
        coins: [{ denom, amount }]
      })
    )

    await Queue.push(SEND_QUEUE_NAME, { from: 'lp', inputs, outputs })
  }

  async function queueSendToLP() {
    const inputs: InOut[] = [
      {
        address: lpKey.address,
        coins: [{ denom: 'ukrw', amount: '1' }]
      }
    ]

    inputs.push(
      ...values.map(
        ({ denom, amount }, index): InOut => ({
          address: keys[index].address,
          coins: [{ denom, amount }]
        })
      )
    )

    const outputs: InOut[] = [
      {
        address: lpKey.address,
        coins: [{ denom: 'ukrw', amount: '1' }]
      }
    ]

    outputs.push(
      ...values.map(
        ({ denom, amount }): InOut => ({
          address: lpKey.address,
          coins: [{ denom, amount }]
        })
      )
    )

    await Queue.push(SEND_QUEUE_NAME, { from: 'user', inputs, outputs, userIds: values.map(v => v.userId) })
  }
}

async function batchSend() {
  // 한번에 하나씩만 처리
  const [value] = await Queue.peek(SEND_QUEUE_NAME, 1)

  // empty queue
  if (!value) {
    return
  }

  const { from, inputs, outputs }: { from: string; inputs: InOut[]; outputs: InOut[] } = value

  /**
   * MultiSend LP to users
   */
  if (from === 'lp') {
    const gas = 150000 + inputs.length * 40000
    const { value: tx } = generateStdTx(
      [generateMultiSend(inputs, outputs)],
      { gas: gas.toString(), amount: [{ amount: (gas * 0.015).toString(), denom: 'ukrw' }] },
      'terra batch: lp to users'
    )

    console.log(`lp > users: ${inputs.length}`)

    tx.signatures.push(
      await transaction.sign(null, lpKey, tx, {
        chain_id: args.chainID,
        account_number: lpAccount.account_number,
        sequence: lpAccount.sequence
      })
    )

    const body = transaction.createBroadcastBody(tx, 'sync')
    const height = await client.broadcast(args.lcdAddress, lpAccount, body)

    console.log(`height ${height}, sequence: ${lpAccount.sequence}`)

    if (height <= 0) {
      console.error('could not send broadcast! must be fixed', value)
      return
    }

    await Queue.pop(SEND_QUEUE_NAME)
    return
  }

  /**
   * MultiSend users to LP
   */
  if (from === 'user') {
    console.log(`users > lp: ${inputs.length}`)

    // re-calculate coins by current tax rate
    const taxRate = await client.queryTaxRate(args.lcdAddress)
    console.log(`current taxRate ${taxRate}`)

    inputs.forEach(inp => {
      const { coins } = inp
      coins.forEach(coin => {
        // gas fee를 내기 위해 ukrw 1을 보내게 되있어서 예외 처리 필요
        if (+coin.amount > 1) {
          coin.amount = Math.floor(+coin.amount / (1 + taxRate)).toString()
        }
      })
    })

    outputs.forEach(inp => {
      const { coins } = inp
      coins.forEach(coin => {
        if (+coin.amount > 1) {
          coin.amount = Math.floor(+coin.amount / (1 + taxRate)).toString()
        }
      })
    })

    const gas = 150000 + inputs.length * 40000
    const { value: tx } = generateStdTx(
      [generateMultiSend(inputs, outputs)],
      { gas: gas.toString(), amount: [{ amount: (gas * 0.015).toString(), denom: 'ukrw' }] },
      'terra batch: users to lp'
    )

    tx.signatures.push(
      await transaction.sign(null, lpKey, tx, {
        chain_id: args.chainID,
        account_number: lpAccount.account_number,
        sequence: lpAccount.sequence
      })
    )

    const keys = await getKeys(value.userIds.map(userId => ({ userId })))

    const accounts = await Bluebird.map(keys, ({ address }) => client.queryAccount(args.lcdAddress, address), {
      concurrency
    })

    tx.signatures.push(
      ...(await Bluebird.map(
        keys,
        (key, index) =>
          transaction.sign(null, key, tx, {
            chain_id: args.chainID,
            account_number: accounts[index].account_number,
            sequence: accounts[index].sequence
          }),
        { concurrency }
      ))
    )

    const body = transaction.createBroadcastBody(tx)
    const height = await client.broadcast(args.lcdAddress, lpAccount, body)

    console.log(`height ${height}, sequence: ${lpAccount.sequence}`)

    if (height <= 0) {
      console.error('could not send broadcast! must be fixed', value)
      return
    }

    await Queue.pop(SEND_QUEUE_NAME)
    return
  }
}

async function asyncSendLoop() {
  await batchSend()
  setTimeout(asyncSendLoop, 5000)
}

async function asyncQueueLoop() {
  await batchQueue()
  setTimeout(asyncQueueLoop, 5000)
}

async function main() {
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'Imports key into database'
  })

  parser.addArgument(['--chain-id'], {
    help: 'chain id',
    dest: 'chainID',
    choices: ['soju-0009', 'columbus-2'],
    required: true
  })

  parser.addArgument(['--lcd'], {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  parser.addArgument(['--lp-key'], {
    help: 'name of LP key',
    dest: 'lpName',
    required: true
  })

  parser.addArgument(['--lp-password'], {
    help: 'password of LP key',
    dest: 'lpPassword',
    required: true
  })

  parser.addArgument(['--sig-limit'], {
    defaultValue: 6,
    dest: 'sigLimit',
    type: Number
  })

  args = parser.parseArgs()

  // Get LP key and query account for account_number and sequence
  lpKey = await keystore.get(terraDB, args.lpName, args.lpPassword)
  lpAccount = await client.queryAccount(args.lcdAddress, lpKey.address)

  console.log('lpAccount', lpAccount)

  await asyncSendLoop()
  await asyncQueueLoop()

  // redis.disconnect()
}

main().catch(console.error)
