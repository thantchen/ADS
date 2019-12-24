import * as fs from 'fs'
import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as validateUUID from 'uuid-validate'
import * as ProgressBar from 'progress'
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
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'Collect user wallets'
  })

  parser.addArgument(['--lcd'], {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  const args = parser.parseArgs()
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

      const bar = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: userIds.length })
      const stream = fs.createWriteStream('wallets.txt')

      await Bluebird.map(
        userIds,
        async key => {
          const password = CryptoJS.SHA256(key)
          const fromKey = await keystore.get(terraDB, key, password)
          const fromAccount = await client.queryAccount(args.lcdAddress, fromKey.address)

          if (fromAccount.coins && fromAccount.coins.length) {
            stream.write(
              `${key} ${fromAccount.account_number} ${fromAccount.sequence} ${JSON.stringify(
                fromAccount.coins
              )} ${JSON.stringify(fromKey)}\n`
            )
          }

          bar.tick()
        },
        { concurrency: 16 }
      )

      stream.close()
      console.log('Stream ended')
    })
}

main().catch(console.error)
