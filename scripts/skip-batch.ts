import * as Bluebird from 'bluebird'
import * as level from 'level'
import redis, { Queue } from 'redis'
import { ArgumentParser } from 'argparse'
import * as config from 'config'
import { Key } from 'lib/keyUtils'
import * as client from 'lib/client'
import { getBatch, getOrCreateKey } from 'batchTerra'

const main = async () => {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'remove latest tx batch'
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
  const { tx } = await client.queryTx(args.lcdAddress, args.txhash)
  const inputs = tx.value.msg[0].value.inputs
  const signatureCount = tx.value.signatures.length

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
}

main().catch(console.error)
