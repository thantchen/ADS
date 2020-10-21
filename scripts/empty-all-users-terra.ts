import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as validateUUID from 'uuid-validate'
import * as ProgressBar from 'progress'
import { chunk, uniqBy } from 'lodash'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import { generateStdTx, generateMultiSend, InOut, Coin } from 'lib/msg'
import sign from 'lib/sign'

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
  const userIds: string[] = []

  const lpKey = await keystore.get(terraDB, args.lpName, args.lpPassword)

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
      const accounts: [string, Coin[]][] = []

      await Bluebird.map(
        userIds,
        async key => {
          const password = CryptoJS.SHA256(key)
          const fromKey = await keystore.get(terraDB, key, password)
          const fromAccount = await client.queryAccount(args.lcdAddress, fromKey.address)

          if (fromAccount.coins && fromAccount.coins.length) {
            accounts.push([key, fromAccount.coins])
          }

          bar.tick()
        },
        { concurrency: 16 }
      )

      console.log(`Found ${accounts.length} accounts with coins`)
      const bar2 = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: accounts.length })

      await Bluebird.mapSeries(chunk(accounts, 99), async accountsChunk => {
        const inputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
        const outputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
        const keys = [lpKey]

        await Bluebird.mapSeries(accountsChunk, async account => {
          const password = CryptoJS.SHA256(account[0])
          const fromKey = await keystore.get(terraDB, account[0], password)

          inputs.push({ address: fromKey.address, coins: account[1] })
          outputs.push({ address: lpKey.address, coins: account[1] })
          keys.push(fromKey)
        })

        const tx = generateStdTx([generateMultiSend(inputs, outputs)], {
          gas: '0',
          amount: [{ denom: 'ukrw', amount: '1' }]
        })
        const est = await client.estimateTax(args.lcdAddress, tx)

        tx.fee.amount = est.fees
        tx.fee.gas = est.gas

        tx.signatures = await Bluebird.map(
          uniqBy(keys, k => k.address),
          async key => {
            const account = await client.queryAccount(args.lcdAddress, key.address)

            return sign(null, key, tx, {
              chain_id: args.chainID,
              account_number: account.account_number,
              sequence: account.sequence
            })
          }
        )

        await client.broadcast(args.lcdAddress, tx, 'sync')
        bar2.tick(accountsChunk.length)
      })

      console.log('Stream ended')
    })
}

main().catch(console.error)
