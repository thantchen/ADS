import * as CryptoJS from 'crypto-js'
import * as keyUtils from './keyUtils'

const KEY_SIZE = 256
const ITERATIONS = 100

function encrypt(plainText: string, password: string) {
  const salt = CryptoJS.lib.WordArray.random(128 / 8)

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE / 32,
    iterations: ITERATIONS
  })

  const iv = CryptoJS.lib.WordArray.random(128 / 8)

  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  })

  // salt, iv will be hex 32 in length
  // append them to the ciphertext for use  in decryption
  return salt.toString() + iv.toString() + encrypted.toString()
}

export async function create(db, chainName: string, name: string, password: string, mnemonic?: string) {
  const wallet = await keyUtils.createWalletFromMnemonic(chainName, mnemonic || keyUtils.generateMnemonic())
  const ciphertext = encrypt(JSON.stringify(wallet), password)

  await db.put(name, ciphertext)
  return wallet
}

function decrypt(compositeMsg: string, password: string) {
  const salt = CryptoJS.enc.Hex.parse(compositeMsg.substr(0, 32))
  const iv = CryptoJS.enc.Hex.parse(compositeMsg.substr(32, 32))
  const encrypted = compositeMsg.substring(64)

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE / 32,
    iterations: ITERATIONS
  })

  return CryptoJS.AES.decrypt(encrypted, key, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  }).toString(CryptoJS.enc.Utf8)
}

export async function get(db, name: string, password: string) {
  const ciphertext = await db.get(name)

  try {
    const plainText = decrypt(ciphertext, password)
    return JSON.parse(plainText)
  } catch (err) {
    throw new Error('Incorrect password')
  }
}
