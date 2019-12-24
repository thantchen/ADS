/*
 * 동시에 여러 multisend를 하기 위해 fee를 제공할 50개 월렛을 만든다
 */
import * as Bluebird from 'bluebird'
import * as ProgressBar from 'progress'
import axios from 'axios'
import * as config from 'config'

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const claims: string[][] = []

async function main() {
  for (let i = 0; i < 50; i += 1) {
    claims.push(['lp', `lp${i}`, '10000'])
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
