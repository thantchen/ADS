import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import { generateStdTx, generateMultiSend, InOut } from 'lib/msg'
import sign from 'lib/sign'
import { Key } from 'lib/keyUtils'

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
    addHelp: true,
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
  const lpKey = await keystore.get(terraDB, args.lpName, args.lpPassword)
  const lpAccount = await client.queryAccount(args.lcdAddress, lpKey.address)
  const userKey = await keystore.get(terraDB, args.userId, CryptoJS.SHA256(args.userId))
  const userAccount = await client.queryAccount(args.lcdAddress, userKey.address)

  const inputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]
  const outputs: InOut[] = [{ address: lpKey.address, coins: [{ denom: 'ukrw', amount: '1' }] }]

  const keys: [Key, string, string][] = [[lpKey, lpAccount.account_number, lpAccount.sequence]]

  if (userAccount.coins.length !== 0) {
    inputs.push({ address: userKey.address, coins: userAccount.coins });
    outputs.push({ address: lpKey.address, coins: userAccount.coins });
    keys.push([userKey, userAccount.account_number, userAccount.sequence])
  }

  if (inputs.length === 1) {
    return
  }

  const tx = generateStdTx([generateMultiSend(inputs, outputs)], {
    gas: '0',
    amount: [{ denom: 'ukrw', amount: '1' }]
  })

  const est = await client.estimateTax(args.lcdAddress, tx)

  tx.fee.amount = est.fees
  tx.fee.gas = est.gas

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]

    tx.signatures[i] = await sign(null, key[0], tx, {
      chain_id: args.chainID,
      account_number: key[1],
      sequence: key[2]
    })
  }

  await client.broadcast(args.lcdAddress, tx, 'sync')
}

main().catch(console.error)
