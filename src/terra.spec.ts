import * as level from 'level'
import { LCDClient, MsgMultiSend, Wallet, RawKey, isTxError } from '@terra-money/terra.js'
import * as keystore from 'lib/keystore'

const db = level('data/terra')

describe('terra', () => {
  const client = new LCDClient({
    URL: 'http://localhost:1317',
    chainID: 'localterra',
    gasPrices: '178.05ukrw'
  })

  afterAll(() => {
    db.close()
  })

  test('MultiSend', async () => {
    const coins = '10000ukrw'

    const key = await keystore.get(db, 'test1', '12345678')
    const rawKey = new RawKey(Buffer.from(key.privateKey, 'hex'))
    const wallet = new Wallet(client, rawKey)

    const result = await wallet
      .createAndSignTx({
        msgs: [
          new MsgMultiSend(
            [
              new MsgMultiSend.Input('terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v', coins),
              new MsgMultiSend.Input('terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v', coins),
              new MsgMultiSend.Input('terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v', coins),
              new MsgMultiSend.Input('terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v', coins),
              new MsgMultiSend.Input('terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v', coins)
            ],
            [
              new MsgMultiSend.Output('terra1vltyder4j8ulc8xdnd2k8fl7w3qhm63k2wek5n', coins),
              new MsgMultiSend.Output('terra1gesvrhvljrlr54r4dw0gmktalnd5md0eg09gpr', coins),
              new MsgMultiSend.Output('terra154wrc4xh7yrw7lc9u3qgm7wmkvu24j662jjc3v', coins),
              new MsgMultiSend.Output('terra1tknree79u9h3v92mx2yrm98acpff7hmywuqh35', coins),
              new MsgMultiSend.Output('terra1vltyder4j8ulc8xdnd2k8fl7w3qhm63k2wek5n', coins)
            ]
          )
        ],
        memo: 'Sent by lp server'
      })
      .then(tx => client.tx.broadcast(tx))

    if (isTxError(result)) {
      throw new Error('tx failed')
    }

    expect(result.height).toBeGreaterThan(0)
  }, 30000)
})
