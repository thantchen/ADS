import * as Bluebird from 'bluebird'
import * as level from 'level'
import * as config from 'config'
import * as CryptoJS from 'crypto-js'
import * as validateUUID from 'uuid-validate'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import * as transaction from 'lib/transaction'
import { generateSend, generateStdTx } from 'lib/msg'

const terraDB = level(config.db.terra.path)

Bluebird.config({
  longStackTraces: true
})

global.Promise = Bluebird

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const lcdAddress = 'http://localhost:2317'

terraDB
  .createReadStream()
  .on('data', async data => {
    if (validateUUID(data.key)) {
      const password = CryptoJS.SHA256(data.key)
      const toKey = await keystore.get(terraDB, 'LP', 'aCDurbvGahhwz=4Jpns8MEUT')
      const fromKey = await keystore.get(terraDB, data.key, password)
      const fromAccount = await client.queryAccount(lcdAddress, fromKey.address)

      if (fromAccount.coins && +fromAccount.coins[0].amount > 1200) {
        const amount = Math.floor(+fromAccount.coins[0].amount / 1.001) - 1200
        console.log(`${fromAccount.address}, ${amount}`)

        const msg = {
          type: 'pay/MsgSend',
          value: {
            amount: [
              {
                amount: amount.toString(),
                denom: 'ukrw'
              }
            ],
            from_address: fromKey.address,
            to_address: toKey.address
          }
        }

        const { value: tx } = generateStdTx([msg], { gas: '80000', amount: [{ denom: 'ukrw', amount: '1200' }] }, '')

        tx.signatures.push(
          await transaction.sign(null, fromKey, tx, {
            chain_id: 'columbus-2',
            account_number: fromAccount.account_number,
            sequence: fromAccount.sequence
          })
        )

        const body = transaction.createBroadcastBody(tx)
        const height = await client.broadcast(lcdAddress, fromAccount, body)

        if (height <= 0) {
          console.error(`broadcast failed. account: ${fromAccount}`)
        } else {
          console.log(height)
        }
      }
    }
  })
  .on('error', err => {
    console.log('Oh my!', err)
  })
  .on('close', () => {
    console.log('Stream closed')
  })
  .on('end', () => {
    console.log('Stream ended')
  })
