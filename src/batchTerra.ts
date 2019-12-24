import * as Sentry from '@sentry/node'
import * as Bluebird from 'bluebird'
import * as level from 'level'
import redis, { Queue } from 'redis'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import { Key } from 'lib/keyUtils'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import sign from 'lib/sign'
import { InOut, Coin, generateMultiSend, generateStdTx } from 'lib/msg'

Sentry.init({ dsn: 'https://655dfc24aaaa40fbbebb5d3c015b0f7a@sentry.io/1532513' })

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

/////////////////////////////
const terraDB = level(config.db.terra.path)

// variable for storing command line parameters
let args

// variables for lp wallet caching
let lpKey: Key
let lpAccount
let isTerminate: boolean = false

process.on('unhandledRejection', err => {
  console.error(err)
  process.env.NODE_CONFIG_ENV === 'prod' && Sentry.captureException(err)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('Caught interrupt signal. Graceful shutdown started.')
  if (!isTerminate) isTerminate = true
})

interface QueueElement {
  denom: string
  from: string
  to: string
  amount: string
}

async function getOrCreateKey(keyName: string): Promise<Key> {
  // Get or create keys from keystore
  const password = CryptoJS.SHA256(keyName)

  return keystore.get(terraDB, keyName, password).catch(() => {
    console.info(`created key for ${keyName}`)
    return keystore.create(terraDB, 'terra', keyName, password)
  })
}

function getBatch(table: [string, string, string][]) {
  const indexes: number[] = []
  const toAddresses: string[] = []
  const lastIndexes = new Set()

  for (let i = 0; i < table.length; i += 1) {
    const row = table[i]

    if (!toAddresses.find(addr => addr === row[0]) && !lastIndexes[row[0]]) {
      indexes.push(i)
      toAddresses.push(row[1])
    }

    if (row[1] !== 'lp') {
      lastIndexes[row[1]] = i
    }
  }

  return indexes
}

async function batchQueue() {
  // 최대 99개까지 MultiSend하므로 (0번은 lp wallet)
  const elements: QueueElement[] = await Queue.peek(config.queue.name, 3000)

  if (elements.length === 0) {
    console.log('waiting for data')
    return
  }

  const inputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
  const outputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
  const keys = [lpKey]

  const indexes = getBatch(elements.map(el => [el.from, el.to, el.amount]))

  for (let i = 0; i < indexes.length; i += 1) {
    const el = elements[indexes[i]]

    let fromKey: Key
    let toKey: Key

    if (el.from !== 'lp') {
      fromKey = await getOrCreateKey(el.from)

      // Add key for signing
      if (!keys.find(k => k.address === fromKey.address)) {
        keys.push(fromKey)
      }
    } else {
      fromKey = lpKey
    }

    if (el.to !== 'lp') {
      toKey = await getOrCreateKey(el.to)
    } else {
      toKey = lpKey
    }

    const coins: Coin[] = [{ denom: el.denom, amount: el.amount }]

    inputs.push({ address: fromKey.address, coins })
    outputs.push({ address: toKey.address, coins })

    if (keys.length >= args.sigLimit) {
      console.log(`Signature limit reached. Shrinked to ${i + 1} from ${indexes.length}`)
      indexes.length = i + 1
      break
    }
  }

  const tx = generateStdTx([generateMultiSend(inputs, outputs)], {
    gas: '0',
    amount: [{ denom: 'ukrw', amount: '1' }]
  })

  const est = await client.estimateTax(args.lcdAddress, tx)

  tx.fee.amount = est.fees
  tx.fee.gas = est.gas

  tx.signatures = await Bluebird.map(
    keys,
    async key => {
      const account = await client.queryAccount(args.lcdAddress, key.address)

      return sign(null, key, tx, {
        chain_id: args.chainID,
        account_number: account.account_number,
        sequence: account.sequence
      })
    },
    { concurrency: 20 }
  )

  console.log(`broadcasting ${inputs.length} sends with ${tx.signatures.length} signature(s).`)

  await client.broadcast(args.lcdAddress, tx, 'sync')
  await Queue.delete(config.queue.name, indexes)
}

// Error handler for business logics
const handleError = async err => {
  console.error(err)

  // Wait for 1 minute for error throttling
  process.env.NODE_CONFIG_ENV === 'prod' && Sentry.captureException(err) && (await Bluebird.delay(60 * 1000))
  return true
}

async function asyncQueueLoop() {
  const startTime = Date.now()

  await batchQueue().catch(handleError)

  if (isTerminate) {
    process.exit(0)
  }

  // Sleep to reducing CPU cost, adjust sleep time bsed on the success of batchSend
  setTimeout(asyncQueueLoop, Math.max(0, startTime + 6500 - Date.now()))
}

async function main() {
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'Imports key into database'
  })

  parser.addArgument(['--chain-id'], {
    help: 'chain id',
    dest: 'chainID',
    choices: ['vodka-0001', 'columbus-3'],
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

  await asyncQueueLoop()

  // redis.disconnect()
}

main().catch(console.error)
