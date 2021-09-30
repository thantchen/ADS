import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as validateUUID from 'uuid-validate'
import * as ProgressBar from 'progress'
import { LCDClient, MsgMultiSend, Wallet, RawKey, Coin, StdTx } from '@terra-money/terra.js'
import { chunk, uniqBy } from 'lodash'
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
  const client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

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
          const fromAccount = await client.bank.balance(fromKey.address)
          const coins = fromAccount.toArray()

          if (coins.length) {
            accounts.push([key, coins])
          }

          bar.tick()
        },
        { concurrency: 16 }
      )

      console.log(`Found ${accounts.length} accounts with coins`)
      const bar2 = new ProgressBar('[:bar] :percent :rate/sec', { width: 50, total: accounts.length })

      const wallet = new Wallet(client, new RawKey(Buffer.from(lpKey.privateKey, 'hex')))

      await Bluebird.mapSeries(chunk(accounts, 99), async accountsChunk => {
        const inputs: MsgMultiSend.Input[] = []
        const outputs: MsgMultiSend.Output[] = []
        const keys = [lpKey]

        inputs.push(new MsgMultiSend.IO(lpKey.address, '1ukrw'))
        outputs.push(new MsgMultiSend.IO(lpKey.address, '1ukrw'))

        await Bluebird.mapSeries(accountsChunk, async account => {
          const password = CryptoJS.SHA256(account[0])
          const fromKey = await keystore.get(terraDB, account[0], password)

          inputs.push(new MsgMultiSend.IO(fromKey.address, account[1]))
          outputs.push(new MsgMultiSend.IO(lpKey.address, account[1]))
          keys.push(fromKey)
        })

        const tx = await wallet.createTx({ msgs: [ new MsgMultiSend(inputs, outputs) ]})
        const signatures = await Bluebird.map(
          uniqBy(keys, k => k.address),
          async key => {
            const account = await client.auth.accountInfo(key.address)
            const rawKey = new RawKey(Buffer.from(key.privateKey, 'hex'))

            tx.account_number = account.account_number
            tx.sequence = account.sequence
            return rawKey.createSignature(tx)
          }
        )

        const stdTx = new StdTx(tx.msgs, tx.fee, signatures)
        await client.tx.broadcastSync(stdTx)
        bar2.tick(accountsChunk.length)
      })

      console.log('Stream ended')
    })
}

main().catch(console.error)
