import * as Bluebird from 'bluebird'
import * as level from 'level'
import Big from 'big.js'
import * as CryptoJS from 'crypto-js'
import redis, { Queue } from 'redis'
import * as config from 'config'
import * as client from 'lib/client'
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
  const { FIX } = process.env
  const terraDB = level(config.db.terra.path)

  const elems = await Queue.peek(config.queue.name, 3000)
  const indexes = getBatch(elems.map(({ from, to, amount }) => ([ from, to, amount ])))
  const dels: number[] = []
  const accounts = new Set()

  await Bluebird.mapSeries(indexes, async index => {
    const el = elems[index]

    // if (el.from !== 'lp' && !el.from.startsWith('m:')) {
    if (el.from !== 'lp') {
      const key = await keystore.get(terraDB, el.from, CryptoJS.SHA256(el.from))
      let account = accounts[key.address];

      if (!account) {
        account = await client.queryAccount('http://localhost:2317', key.address)
        accounts[key.address] = account
      }

      if (account.coins.length === 0) {
        console.log(`empty account: ${el.from} ${key.address}`);

        if (FIX) {
          dels.push(index)
        }
      } else {
        if (Big(account.coins[0].amount).lt(el.amount)) {
          console.log(`insufficient fund: ${el.from} ${key.address} ${account.coins[0].amount} < ${el.amount}`)
          el.amount = account.coins[0].amount

          if (FIX) {
            redis.lset(config.queue.name, index, JSON.stringify(el))
          }
        } else {
          account.coins[0].amount = Big(account.coins[0].amount).minus(el.amount).toString()
        }
      }
    }
  })

  console.log(`deleting ${dels.length}`)
  await Queue.delete(config.queue.name, dels)
}

main().catch(console.error)
