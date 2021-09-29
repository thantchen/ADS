import * as fs from 'fs'
import * as Bluebird from 'bluebird'
import { ArgumentParser } from 'argparse'
import { chunk } from 'lodash'
import * as es from 'event-stream'
import * as ProgressBar from 'progress'
import * as client from 'lib/client'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const parser = new ArgumentParser({
    add_help: true,
    description: 'Vacuum wallets'
  })

  parser.add_argument('--lcd', {
    help: 'lcd address',
    dest: 'lcdAddress',
    required: true
  })

  const args = parser.parse_args()

  const allLines: string[][] = []

  async function multiSend(lines: string[][], workerIndex: number) {
    await Bluebird.map(lines, async line => {
      if (line.length <= 1) return

      const fromKey = JSON.parse(line[4])
      const account = await client.queryAccount(args.lcdAddress, fromKey.address)

      if (account.coins.length !== 0) {
        console.log(line);
      }
    })
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

        await Bluebird.delay(500)
        worker(index)
      }

      for (let i = 0; i < 5; i += 1) {
        setTimeout(worker.bind(null, i), i * 100)
      }
    })
}

main().catch(console.error)
