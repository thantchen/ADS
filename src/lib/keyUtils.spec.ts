import { generateMnemonic, createKeyFromMnemonic } from './keyUtils'

describe('keyUtils', () => {
  test('mnemonic', async () => {
    const m = generateMnemonic()

    expect(typeof m).toBe('string')
    expect(m.split(' ').length).toBe(24)
  })

  test('invalid mnemonic', async () => {
    await expect(createKeyFromMnemonic('terra', 'invalid mnemonic')).rejects.toThrow();
  })

  test('key integrity', async () => {
    const key = await createKeyFromMnemonic(
      'terra',
      'online lamp sheriff frost cattle custom method fox gym firm stamp imitate slush guide secret program spray wine antenna grief neutral blanket barrel report'
    )

    expect(key).toMatchObject({
      chainName: 'terra',
      privateKey: '0c3212ff1fd8245d388a70cd85734378bb819731feb442ac9a3515d36eb5401f',
      publicKey: '034a4bb38e3cf4cddc57d628b45c6c457e3c305df83d3a1c4dce0a5699706d0ebb',
      address: 'terra1rx83a7mf8nz9v09daundjftexk90slnws0vdkp',
      valAddress: 'terravaloper1rx83a7mf8nz9v09daundjftexk90slnwsqqsxj'
    })
  })
})
