import * as level from 'level'
import redis, { Queue } from 'redis'
import { ArgumentParser } from 'argparse'
import * as config from 'config'
import { LCDClient, MsgMultiSend } from '@terra-money/terra.js'
import { Key } from 'lib/keyUtils'
import { getBatch, getOrCreateKey } from 'batchTerra'

const main = async () => {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'remove latest tx batch'
  })

  parser.add_argument('--chain-id', {
    help: 'chain id',
    dest: 'chainID',
    required: true
  })

  parser.add_argument('--lcd', {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  parser.add_argument('--txhash', {
    help: 'transaction hash',
    required: true
  })

  parser.add_argument('--execute', {
    help: 'execute remove',
    action: 'store_true'
  })

  const args = parser.parse_args()
  const client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

  const { tx } = await client.tx.txInfo(args.txhash)
  const msgData = tx.msg[0].toData() as MsgMultiSend.Data

  if (!msgData.type.includes('MultiSend')) {
    console.log('tx does not have MultiSend message', tx.msg[0].toJSON())
    process.exit(1)
  }

  const inputs = msgData.value.inputs
  const signatureCount = tx.signatures.length

  console.log(`tx cotains ${inputs.length} MultiSend`)

  const terraDB = level(config.db.terra.path)
  const elems = await Queue.peek(config.queue.name, 1000)
  const indexes = getBatch(elems.map(({ from, to, amount }) => ([ from, to, amount ])))
  const keys: Key[] = []

  let i

  for (i = 0; i < indexes.length && i < inputs.length - 1; i += 1) {
    const el = elems[indexes[i]]

    let fromKey: Key

    if (el.from !== 'lp') {
      fromKey = await getOrCreateKey(terraDB, el.from)

      // Add key for signing
      if (!keys.find(k => k.address === fromKey.address)) {
        keys.push(fromKey)
      }
    }

    if (el.amount !== inputs[i + 1].coins[0].amount) {
      throw new Error(`invariant found! queue ${el.amount} != ${inputs[i + 1].coins[0].amount}`)
    }

    if (keys.length >= signatureCount) {
      indexes.length = i + 1
      break
    }
  }

  indexes.length = i + 1

  if (indexes.length !== inputs.length) {
    throw new Error('queue and multisend size mismatch!')
  }

  if (args.execute) {
    await Queue.delete(config.queue.name, indexes)
    console.log('deleted!')
  } else {
    console.log('This is a dry run. add --execute parameter')
  }

  await terraDB.close()
  await redis.quit()
}

main().catch(console.error)
