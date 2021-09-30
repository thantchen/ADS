import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as keystore from 'lib/keystore'
import { Key } from 'lib/keyUtils'
import { LCDClient, MsgMultiSend, Wallet, RawKey, StdTx } from '@terra-money/terra.js'

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

  parser.add_argument('--user-id', {
    dest: 'userId',
    required: true
  })

  const args = parser.parse_args()
  const terraDB = level(config.db.terra.path)
  const client = new LCDClient({
    URL: args.lcdAddress,
    chainID: args.chainID,
    gasPrices: '443.515327ukrw'
  })

  const userKey = await keystore.get(terraDB, args.userId, CryptoJS.SHA256(args.userId))
  const userCoins = (await client.bank.balance(userKey.address)).toArray()

  if (userCoins.length === 0) {
    console.log(`${userKey.address} does not have any coins`)
    return
  }

  const lpKey = await keystore.get(terraDB, args.lpName, args.lpPassword)
  const lpAccount = await client.auth.accountInfo(lpKey.address)
  const userAccount = await client.auth.accountInfo(userKey.address)

  const inputs: MsgMultiSend.IO[] = [
    new MsgMultiSend.IO(lpKey.address, '1ukrw'),
    new MsgMultiSend.IO(userKey.address, userCoins)
  ]

  const outputs: MsgMultiSend.IO[] = [
    new MsgMultiSend.IO(lpKey.address, '1ukrw'),
    new MsgMultiSend.IO(lpKey.address, userCoins)
  ]

  const keys: [Key, number, number][] = [
    [lpKey, lpAccount.account_number, lpAccount.sequence],
    [userKey, userAccount.account_number, userAccount.sequence]
  ]

  const wallet = new Wallet(client, new RawKey(Buffer.from(lpKey.privateKey, 'hex')))
  const tx = await wallet.createTx({ msgs: [ new MsgMultiSend(inputs, outputs) ]})
  const signatures = await Promise.all(keys.map(key => {
    const rawKey = new RawKey(Buffer.from(key[0].privateKey, 'hex'))

    tx.account_number = key[1]
    tx.sequence = key[2]
    return rawKey.createSignature(tx)
  }))
  
  const stdTx = new StdTx(tx.msgs, tx.fee, signatures)
  console.log(await client.tx.broadcastSync(stdTx))
}

main().catch(console.error)
