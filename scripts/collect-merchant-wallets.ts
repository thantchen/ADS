import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import * as CryptoJS from 'crypto-js'
import * as keystore from 'lib/keystore'

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

  terraDB
    .createReadStream()
    .on('data', async data => {
      if (data.key.startsWith('m:')) {
        const fromKey = await keystore.get(terraDB, data.key, CryptoJS.SHA256(data.key))

        console.log(`${data.key} ${fromKey.address}`);
      }
    })
    .on('error', err => {
      console.log('Oh my!', err)
    })
    .on('close', () => {
      console.log('Stream closed')
    })
    .on('end', async () => {
      console.log('Stream ended')
    })
}

main().catch(console.error)
