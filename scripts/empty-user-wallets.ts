import * as fs from 'fs'
import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import { chunk } from 'lodash'
import * as es from 'event-stream'
import * as memoizee from 'memoizee'
import * as ProgressBar from 'progress'
import * as keystore from 'lib/keystore'
import { Key } from 'lib/keyUtils'
import * as client from 'lib/client'
import { generateStdTx, generateMultiSend, InOut } from 'lib/msg'
import sign from 'lib/sign'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const LP_COUNT = 50

async function main() {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Vacuum wallets'
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

  const args = parser.parse_args()
  const terraDB = level(config.db.terra.path)

  const allLines: string[][] = []

  async function getKeyUncached(name: string) {
    const key = await keystore.get(terraDB, name, CryptoJS.SHA256(name))
    console.log(`${name} ${key.address}`)
    return key
  }

  const getKey = memoizee(getKeyUncached, { promise: true })
  const lpCache: { key: Key; account: any }[] = []

  for (let i = 0; i < LP_COUNT; i += 1) {
    const lpName = `${args.lpName}${i}`
    const key = await getKey(lpName)
    const account = await client.queryAccount(args.lcdAddress, key.address)

    lpCache[i] = {
      key,
      account
    }
  }

  async function multiSend(lines: string[][], workerIndex: number) {
    const lpKey = lpCache[workerIndex].key
    const lpAccount = lpCache[workerIndex].account
    const inputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
    const outputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]

    const keys = [[lpKey, lpAccount.account_number, lpAccount.sequence]]

    await Bluebird.map(lines, async line => {
      if (line.length <= 1) return

      const fromKey = JSON.parse(line[4])
      const account = await client.queryAccount(args.lcdAddress, fromKey.address)

      if (account.coins.length !== 0) {
        inputs.push({ address: fromKey.address, coins: account.coins })
        outputs.push({ address: lpKey.address, coins: account.coins })
        keys.push([fromKey, account.account_number, account.sequence])
      }
    })

    if (inputs.length === 1) {
      return
    }

    const tx = generateStdTx([generateMultiSend(inputs, outputs)], {
      gas: '0',
      amount: [{ denom: 'ukrw', amount: '1' }]
    })

    const est = await client.estimateTax(args.lcdAddress, tx)

    tx.fee.amount = est.fees
    tx.fee.gas = est.gas

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]

      tx.signatures[i] = await sign(null, key[0], tx, {
        chain_id: args.chainID,
        account_number: key[1],
        sequence: key[2]
      })
    }

    await client.broadcast(args.lcdAddress, tx, 'sync')
    lpAccount.sequence = (+lpAccount.sequence + 1).toString()
  }

  fs.createReadStream('wallets.txt')
    .pipe(es.split())
    .pipe(
      es.mapSync(line => {
        allLines.push(line.split(' '))
      })
    )
    .on('error', err => {
      console.log('Error while reading file.', err)
    })
    .on('end', async () => {
      console.log(`Read ${allLines.length} accounts`)

      const bar = new ProgressBar('[:bar] :percent :rate/sec :eta', { width: 50, total: allLines.length })
      const tasks = chunk(allLines, 30)
      const worker = async index => {
        const lines = tasks.shift()

        if (!lines) {
          return
        }

        await multiSend(lines, index)
          .then(() => {
            bar.tick(lines.length)
          })
          .catch(err => {
            console.error(`worker ${index} had an error: ${err.message}`)
            // re-add to tasks to retry
            tasks.push(lines)
          })

        await Bluebird.delay(1000)
        await worker(index)
      }

      for (let i = 0; i < LP_COUNT; i += 1) {
        setTimeout(worker.bind(null, i), i * 100)
      }
    })
}

main().catch(console.error)
