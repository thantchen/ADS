import * as Bluebird from 'bluebird'
import { Queue } from 'redis'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import * as transaction from 'lib/transaction'
import { generateSend, generateStdTx } from 'lib/msg'

const tempuraDB = level(config.db.tempura.path)

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

let args
const TEMPURA_QUEUE_NAME = 'lp:tempura:queue'

interface Value {
  id: string
  denom: string
  userId: string
  merchantId: string
  amount: string
  at: string
}

async function batchQueue() {
  const candidateValues: Value[] = await Queue.peek(TEMPURA_QUEUE_NAME, 10)

  if (!candidateValues.length) {
    console.info('queue is empty')
    return
  }

  const firstDenom = candidateValues[0].denom
  let sliceIndex = 1

  // 다른 denom이 나오면 중지한다
  for (let i = 1; i < candidateValues.length; i += 1) {
    console.log(candidateValues[i])
    if (candidateValues[i].denom !== firstDenom) break
    sliceIndex += 1
  }

  console.log(`firstDenom: ${firstDenom}, sliceIndex: ${sliceIndex}`)
  const values = candidateValues.slice(0, sliceIndex)

  // amount 한번에 합쳐서 send하기 위해 합 구하기
  const sum = values.reduce((acc, curr) => acc + +curr.amount, 0)

  // Get LP key and query account for account_number and sequence
  const [lpKey, chaiKey] = await Promise.all([
    keystore.get(tempuraDB, args.lpName, args.lpPassword),
    keystore.get(tempuraDB, args.chaiName, args.chaiPassword)
  ])

  const [lpAccount, chaiAccount] = await Promise.all([
    client.queryAccount(args.lcdAddress, lpKey.address),
    client.queryAccount(args.lcdAddress, chaiKey.address)
  ])

  let fromKey
  let fromAccount
  let toKey
  let memo

  if (firstDenom === 'don') {
    fromKey = lpKey
    fromAccount = lpAccount
    toKey = chaiKey
    memo = 'tempura batch: lp to chai'
  } else {
    fromKey = chaiKey
    fromAccount = chaiAccount
    toKey = lpKey
    memo = 'tempura batch: chai to lp'
  }

  const { value: tx } = generateStdTx(
    [generateSend(sum.toString(), fromKey.address, toKey.address)],
    { gas: '200000', amount: [] }, // tempura는 gas fee 없음
    memo
  )

  tx.signatures.push(
    await transaction.sign(null, fromKey, tx, {
      chain_id: 'testing',
      account_number: fromAccount.account_number,
      sequence: fromAccount.sequence
    })
  )

  const body = transaction.createBroadcastBody(tx, 'block')
  const height = await client.broadcast(args.lcdAddress, lpAccount, body)

  console.log(`height ${height}, sequence: ${lpAccount.sequence}`)

  if (height <= 0) {
    console.error('could not send broadcast! must be fixed', values)
    return
  }

  // 성공. 큐에서 삭제
  await Queue.trim(TEMPURA_QUEUE_NAME, values.length)
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

  parser.addArgument(['--chai-key'], {
    help: 'name of Chai key',
    dest: 'chaiName',
    required: true
  })

  parser.addArgument(['--chai-password'], {
    help: 'password of Chai key',
    dest: 'chaiPassword',
    required: true
  })

  args = parser.parseArgs()

  await asyncQueueLoop()
  // redis.disconnect()
}

main().catch(console.error)
