import * as level from 'level'
import * as keystore from './keystore'

const TEMPURA_CHAIN_NAME = 'tempura'
const OTHER_CHAIN_NAME = 'terra'

describe('keystore', () => {
  const db = level('data/testdb')

  afterAll(async done => {
    await db.close()
    done()
  })

  test('create', async () => {
    const wallet = await keystore.create(db, TEMPURA_CHAIN_NAME, 'test', 'qwer1234')

    expect(wallet).toMatchObject({
      chainName: expect.any(String),
      privateKey: expect.any(String),
      publicKey: expect.any(String),
      address: expect.any(String),
      valAddress: expect.any(String)
    })

    expect(wallet.address.startsWith(TEMPURA_CHAIN_NAME)).toBe(true)
    expect(wallet.valAddress.startsWith(`${TEMPURA_CHAIN_NAME}valoper`)).toBe(true)
  })

  test('get', async () => {
    const wallet = await keystore.get(db, 'test', 'qwer1234')

    expect(wallet).toMatchObject({
      chainName: TEMPURA_CHAIN_NAME,
      privateKey: expect.any(String),
      publicKey: expect.any(String),
      address: expect.any(String),
      valAddress: expect.any(String)
    })

    expect(wallet.address.startsWith(TEMPURA_CHAIN_NAME)).toBe(true)
    expect(wallet.valAddress.startsWith(`${TEMPURA_CHAIN_NAME}valoper`)).toBe(true)
  })

  test('another chain', async () => {
    const db2 = level('data/testdb2')

    const wallet = await keystore.create(db2, OTHER_CHAIN_NAME, 'test', 'qwer1234')

    expect(wallet).toMatchObject({
      chainName: expect.any(String),
      privateKey: expect.any(String),
      publicKey: expect.any(String),
      address: expect.any(String),
      valAddress: expect.any(String)
    })

    expect(wallet.address.startsWith(OTHER_CHAIN_NAME)).toBe(true)
    expect(wallet.valAddress.startsWith(`${OTHER_CHAIN_NAME}valoper`)).toBe(true)

    await db2.close()
  })
})
