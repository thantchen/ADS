import * as Sentry from '@sentry/node'
import * as Bluebird from 'bluebird'
import * as level from 'level'
import { Queue } from 'redis'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import { LCDClient, MsgMultiSend, Wallet, RawKey, Coin, StdTx, isTxError } from '@terra-money/terra.js'
import { Key } from 'lib/keyUtils'
import * as keystore from 'lib/keystore'

Sentry.init({ dsn: 'https://655dfc24aaaa40fbbebb5d3c015b0f7a@sentry.io/1532513' })

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

/////////////////////////////
// variable for storing command line parameters
let args
let db
let client: LCDClient

// variables for lp wallet caching
let lpKey: Key
let isTerminate = false

interface QueueElement {
  denom: string
  from: string
  to: string
  amount: string
}

export async function getOrCreateKey(db: any, keyName: string): Promise<Key> {
  // Get or create keys from keystore
  const password = CryptoJS.SHA256(keyName)

  return keystore.get(db, keyName, password).catch(err => {
    if (err.name !== 'NotFoundError') {
      throw err
    }

    console.info(`created key for ${keyName}`)
    return keystore.create(db, 'terra', keyName, password)
  })
}

export function getBatch(table: [string, string, string][]) {
  const indexes: number[] = []
  const toAddresses: string[] = []
  const lastIndexes = new Set()

  for (let i = 0; i < table.length; i += 1) {
    const row = table[i]

    if (!toAddresses.find(addr => addr === row[0]) && !lastIndexes[row[0]]) {
      indexes.push(i)
      toAddresses.push(row[1])
    }

    if (row[1] !== args.lpName) {
      lastIndexes[row[1]] = i
    }
  }

  return indexes
}

// This function throws error when tx has been written (has height) with error
// Otherwise it returns:
//     -1: failure
// height: success
export async function broadcast(client: LCDClient, tx: StdTx): Promise<number> {
  const data = await client.tx.broadcastSync(tx)

  if (isTxError(data)) {
    if (data.height !== 0) {
      throw new Error(`successful tx with error: ${data.raw_log}, hash: ${data.txhash}`)
    }

    console.error(`broadcast error: ${data.raw_log}`)
    return -1
  }

  const AVERAGE_BLOCK_TIME = 6500
  const MAX_RETRY_COUNT = 30

  // Wait for next block
  await Bluebird.delay(AVERAGE_BLOCK_TIME)

  for (let i = 0; i < MAX_RETRY_COUNT; i += 1) {
    const height = await client.tx.txInfo(data.txhash)
      .then(tx => {
        if (tx.code) {
          throw new Error(`successful tx with error: code: ${tx.code}, raw_log: ${tx.raw_log}, hash: ${data.txhash}`)
        }

        console.info(`txhash: ${tx.txhash}`)
        return tx.height
      })
      .catch(err => {
        if (err.isAxiosError) {
          console.info(`tx not found yet: ${err.message}, hash: ${data.txhash}`)
          return ''
        }

        throw err
      })

    if (height) {
      return +height
    }

    await Bluebird.delay(AVERAGE_BLOCK_TIME)
  }

  throw new Error(`broadcast retrying failed: hash ${data.txhash}`)
}

async function batchQueue() {
  // We can batch multiple sends in one MultiSend message. Also, there is a limitation that
  // one transaction can have 100 maximum signatures.
  // However, We are getting enough number of elements since source address can
  // have multiple destinations.
  // In result, we can batch more than 1000 sends in a single MultiSend message.
  const elements: QueueElement[] = await Queue.peek(config.queue.name, 1000)

  if (elements.length === 0) {
    console.log('waiting for data')
    return
  }

  const wallet = new Wallet(client, new RawKey(Buffer.from(lpKey.privateKey, 'hex')))
  const inputs: MsgMultiSend.IO[] = [new MsgMultiSend.IO(lpKey.address, '1ukrw')]
  const outputs: MsgMultiSend.IO[] = [new MsgMultiSend.IO(lpKey.address, '1ukrw')]
  const keys = [lpKey]

  const indexes = getBatch(elements.map(el => [el.from, el.to, el.amount]))

  for (let i = 0; i < indexes.length; i += 1) {
    const el = elements[indexes[i]]

    let fromKey: Key
    let toKey: Key

    if (el.from !== args.lpName) {
      fromKey = await getOrCreateKey(db, el.from)

      // Add key for signing
      if (!keys.find(k => k.address === fromKey.address)) {
        keys.push(fromKey)
      }
    } else {
      fromKey = lpKey
    }

    if (el.to !== args.lpName) {
      toKey = await getOrCreateKey(db, el.to)
    } else {
      toKey = lpKey
    }

    const coins: Coin[] = [new Coin(el.denom, el.amount)]

    inputs.push(new MsgMultiSend.IO(fromKey.address, coins))
    outputs.push(new MsgMultiSend.IO(toKey.address, coins))

    if (keys.length >= args.sigLimit) {
      console.log(`Signature limit reached. Shrinked to ${i + 1} from ${indexes.length}`)
      indexes.length = i + 1
      break
    }
  }

  const tx = await wallet.createTx({ msgs: [ new MsgMultiSend(inputs, outputs) ]})
  const signatures = await Bluebird.map(
    keys,
    async key => {
      const account = await client.auth.accountInfo(key.address)
      const rawKey = new RawKey(Buffer.from(key.privateKey, 'hex'))

      tx.account_number = account.account_number
      tx.sequence = account.sequence
      return rawKey.createSignature(tx)
    },
    { concurrency: 20 }
  )
  
  console.log(`broadcasting ${inputs.length} sends with ${signatures.length} signature(s).`)
  const stdTx = new StdTx(tx.msgs, tx.fee, signatures)
  const height = await broadcast(client, stdTx)

  if (height > 0) {
    await Queue.delete(config.queue.name, indexes)
  }
}

// Error handler for business logics
const handleError = async err => {
  // Retry on axios error
  if (err.isAxiosError) {
    console.error(err.message, err.response)
    isTerminate = true
  } else {
    console.error(err)
    process.env.NODE_CONFIG_ENV === 'prod' && Sentry.captureException(err)
    isTerminate = true
  }
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

export function parseProgramArguments() {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Imports key into database'
  })

  parser.add_argument('--chain-id', {
    help: 'chain id',
    dest: 'chainID',
    choices: ['localterra', 'tequila-0004', 'columbus-4', 'bombay-12', 'columbus-5'], // TODO: remove old networks
    required: true
  })

  parser.add_argument('--lcd', {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  parser.add_argument('--lp-key', {
    help: 'name of LP key',
    dest: 'lpName',
    required: true
  })

  parser.add_argument('--lp-password', {
    help: 'password of LP key',
    dest: 'lpPassword',
    required: true
  })

  parser.add_argument('--sig-limit', {
    default: 6,
    dest: 'sigLimit',
    type: Number
  })

  return parser.parse_args()
}

async function main() {
  db = level(config.db.terra.path)
  args = parseProgramArguments()
  client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

  // Get LP key and query account for account_number and sequence
  lpKey = await keystore.get(db, args.lpName, args.lpPassword)

  await asyncQueueLoop()
  // redis.disconnect()
}

if (require.main === module) {
  process.on('unhandledRejection', err => {
    console.error(err)
    process.env.NODE_CONFIG_ENV === 'prod' && Sentry.captureException(err)
    process.exit(1)
  })

  process.on('SIGINT', () => {
    console.log('Caught interrupt signal. Graceful shutdown started.')
    if (!isTerminate) isTerminate = true
  })

  main().catch(console.error)
}
