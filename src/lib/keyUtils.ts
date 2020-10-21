import * as ripemd160 from 'crypto-js/ripemd160'
import * as CryptoJS from 'crypto-js'

import * as bip32 from 'bip32'
import * as bip39 from 'bip39'
import * as bech32 from 'bech32'

import * as secp256k1 from 'secp256k1'

const HDPATH = process.env.HDPATH || `m/44'/118'/0'/0/0` // key controlling ATOM allocation

async function deriveMasterKey(mnemonic: string): Promise<bip32.BIP32Interface> {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('invalid mnemonic')
  }

  const seed: Buffer = await bip39.mnemonicToSeed(mnemonic)
  return bip32.fromSeed(seed)
}

function deriveKeypair(masterKey: bip32.BIP32Interface): { privateKey: Buffer; publicKey: Buffer } {
  const terraHD: bip32.BIP32Interface = masterKey.derivePath(HDPATH)
  const privateKey: Buffer | undefined = terraHD.privateKey

  if (!privateKey) {
    throw new Error('private key is undefined')
  }

  const publicKey: Buffer = Buffer.from(secp256k1.publicKeyCreate(privateKey, true))

  return {
    privateKey,
    publicKey
  }
}

// NOTE: this only works with a compressed public key (33 bytes)
export function createAddress(chainName: string, publicKey: Buffer): string {
  const message = CryptoJS.enc.Hex.parse(publicKey.toString(`hex`))
  const hash: string = ripemd160(CryptoJS.SHA256(message)).toString()
  const address: Buffer = Buffer.from(hash, `hex`)
  const words: number[] = bech32.toWords(address)

  return bech32.encode(chainName, words)
}

export function convertAddressToValidatorAddress(chainName: string, address: string) {
  const { words }: { prefix: string; words: number[] } = bech32.decode(address)
  return bech32.encode(`${chainName}valoper`, words)
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic(256)
}

export interface Key {
  chainName: string
  privateKey: string
  publicKey: string
  address: string
  valAddress: string
}

export async function createKeyFromMnemonic(chainName: string, mnemonic: string): Promise<Key> {
  const masterKey = await deriveMasterKey(mnemonic)
  const { privateKey, publicKey } = deriveKeypair(masterKey)
  const address = createAddress(chainName, publicKey)

  return {
    chainName,
    privateKey: privateKey.toString(`hex`),
    publicKey: publicKey.toString(`hex`),
    address,
    valAddress: convertAddressToValidatorAddress(chainName, address)
  }
}
