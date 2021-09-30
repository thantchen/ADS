import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as CryptoJS from 'crypto-js'
import redis, { Queue } from 'redis'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import { LCDClient, Coin } from '@terra-money/terra.js'
import * as keystore from 'lib/keystore'

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

const main = async () => {
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

  const args = parser.parse_args()
  const client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

  const { FIX } = process.env
  const terraDB = level(config.db.terra.path)

  const elems = await Queue.peek(config.queue.name, 3000)
  const indexes = getBatch(elems.map(({ from, to, amount }) => ([ from, to, amount ])))
  const dels: number[] = []
  const balances = new Set<Coin[]>()

  await Bluebird.mapSeries(indexes, async index => {
    const el = elems[index]

    // if (el.from !== 'lp' && !el.from.startsWith('m:')) {
    if (el.from !== 'lp') {
      const key = await keystore.get(terraDB, el.from, CryptoJS.SHA256(el.from))
      let balance: Coin[] = balances[key.address];

      if (!balance) {
        balance = (await client.bank.balance(key.address)).toArray()
        balances[key.address] = balance
      }

      if (balance.length === 0) {
        console.log(`empty account: ${el.from} ${key.address}`);

        if (el.from.startsWith('m:')) {
          console.log('skipping merchant wallet')
        } else {
          if (FIX) {
            dels.push(index)
          }
        }
      } else {
        if (balance[0].amount.lt(el.amount)) {
          console.log(`insufficient fund: ${el.from} ${key.address} ${balance[0].amount} < ${el.amount}`)

          if (el.from.startsWith('m:')) {
            console.log('skipping merchant wallet')
          } else {  
            el.amount = balance[0].amount

            if (FIX) {
              redis.lset(config.queue.name, index, JSON.stringify(el))
            }
          }
        } else {
          balances[key.address] = [new Coin(balance[0].denom, balance[0].amount.minus(el.amount))]
        }
      }
    }
  })

  console.log(`deleting ${dels.length}`)
  await Queue.delete(config.queue.name, dels)
  await terraDB.close()
  await redis.quit()
}

main().catch(console.error)
