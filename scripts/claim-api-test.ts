// FIXME: TODO: WARNING: FIXME: TODO: WARNING: FIXME: TODO: WARNING:
// DO NOT USE ON MAINNET!!!!
// DO NOT USE ON MAINNET!!!!
// DO NOT USE ON MAINNET!!!!
// FIXME: TODO: WARNING: FIXME: TODO: WARNING: FIXME: TODO: WARNING:
import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import * as validateUUID from 'uuid-validate'
import * as ProgressBar from 'progress'
import axios from 'axios'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const terraDB = level(config.db.terra.path)
  const userIds: string[] = []

  terraDB
    .createReadStream()
    .on('data', async data => {
      if (validateUUID(data.key)) {
        userIds.push(data.key)
      }
    })
    .on('error', err => {
      console.log('Oh my!', err)
    })
    .on('close', () => {
      console.log('Stream closed')
    })
    .on('end', async () => {
      console.log(`Total ${userIds.length} found`)
      const bar2 = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: userIds.length })

      await Bluebird.mapSeries(userIds, async userId => {
        await axios.post('http://localhost:9000/claim/don', {
          from: 'lp',
          to: userId,
          amount: 1000
        })

        await axios.post('http://localhost:9000/claim/krw', {
          from: userId,
          to: 'lp',
          amount: 1000
        })

        bar2.tick()
      })

      console.log('Stream ended')
    })
}

main().catch(console.error)
