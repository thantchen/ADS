import * as level from 'level'
import { generateStdTx, generateMultiSend } from 'lib/msg'
import * as transaction from 'lib/transaction'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'

const db = level('data/terra')

describe('terra', () => {
  const lcdAddress = 'https://soju-0008-lcd.terra.dev'
  const chainId = 'soju-0009'

  test('MultiSend', async () => {
    const coins = [{ denom: 'ukrw', amount: '10000' }]
    const { value: tx } = generateStdTx(
      [
        generateMultiSend(
          [
            { address: 'terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy', coins },
            { address: 'terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy', coins },
            { address: 'terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy', coins },
            { address: 'terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy', coins },
            { address: 'terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy', coins }
          ],
          [
            { address: 'terra1uylymy3tdj5vfjvmls4l575lmfjpn7jsfdfrhw', coins },
            { address: 'terra1m96psu5lhr834756f3a7gkrglgn8h9dwgsqa85', coins },
            { address: 'terra1ywva5zjqa7cteqjutrv28yr3fd37dvp8xng2xp', coins },
            { address: 'terra16llntrxj9s2qmtkt9wjsrsm077kyededhawky9', coins },
            { address: 'terra1hczlvtjness3dapxtzv29c656rg4d24nm4mec4', coins }
          ]
        )
      ],
      { gas: '300000', amount: [{ amount: '4500', denom: 'uluna' }] },
      'Sent by lp server'
    )

    const key = await keystore.get(db, 'faucet', '12345678')
    const account = await client.queryAccount(lcdAddress, key.address)

    const signature = await transaction.sign(null, key, tx, {
      chain_id: chainId,
      account_number: account.account_number,
      sequence: account.sequence
    })

    transaction.assignSignature(tx, signature)
    const body = transaction.createBroadcastBody(tx)

    const height = await client.broadcast(
      lcdAddress,
      account,
      body
    )

    expect(height).toBeGreaterThan(0)
  })
})
