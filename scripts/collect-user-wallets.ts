import * as fs from 'fs'
import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as validateUUID from 'uuid-validate'
import * as ProgressBar from 'progress'
import * as es from 'event-stream'
import * as keystore from 'lib/keystore'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

async function loadWallets(): Promise<Set<string>> {
  const wallets: Set<string> = new Set()

  return new Promise((resolve, reject) => {
    fs
      .createReadStream('wallets.txt')
      .pipe(es.split())
      .pipe(
        es.mapSync(line => {
          const cols = line.split(' ')
          wallets.add(cols[0])
        })
      )
      .on('error', reject)
      .on('end', () => {
        console.log(`${wallets.size} has been loaded`)
        resolve(wallets)
      })
  })
}

async function main() {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Collect user wallets'
  })

  parser.add_argument('--lcd', {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  const args = parser.parse_args()
  const terraDB = level(config.db.terra.path)
  const wallets = await loadWallets()
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
      const stream = fs.createWriteStream('wallets.txt', { flags: 'a' })

      await Bluebird.map(
        userIds,
        async userId => {
          bar.tick()

          if (wallets.has(userId)) {
            return
          }

          const fromKey = await keystore.get(terraDB, userId, CryptoJS.SHA256(userId))

          stream.write(`${userId} 0 0 null ${JSON.stringify(fromKey)}\n`)
        },
        { concurrency: 16 }
      )

      stream.close()
      console.log('Stream ended')
    })
}

main().catch(console.error)
