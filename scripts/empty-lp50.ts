/*
 * lp50 계정에서 자금 회수
 */
import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as ProgressBar from 'progress'
import axios from 'axios'
import * as config from 'config'
import Big from 'big.js'
import * as CryptoJS from 'crypto-js'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const claims: string[][] = []
  const terraDB = level(config.db.terra.path)

  for (let i = 0; i < 50; i += 1) {
    const keyName = `lp${i}`
    const key = await keystore.get(terraDB, keyName, CryptoJS.SHA256(keyName))
    const account = await client.queryAccount('http://localhost:2317', key.address)

    claims.push([keyName, 'lp', new Big(account.coins[0].amount).div(1000000).toString()])
  }

  const bar2 = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: claims.length })

  await Bluebird.mapSeries(claims, async claim => {
    await axios.post(`http://localhost:${config.port}/claim/don`, {
      from: claim[0],
      to: claim[1],
      amount: claim[2]
    })

    bar2.tick()
  })
}

main().catch(console.error)
