import * as sha256 from 'crypto-js/sha256'

export interface Amount {
  denom: string
  amount: string
}

export interface Fee {
  gas: string
  amount: Amount[]
}

export interface Signature {
  signature: string
  account_number: string
  sequence: string
  pub_key: {
    type: string
    value: string
  }
}

export interface StdTx {
  fee: Fee
  memo: string
  msg: Record<string, unknown>[]
  signatures: Signature[]
}

function normalizeDecimal(decimalNumber: string) {
  const num = decimalNumber.split('.')
  let result = decimalNumber
  if (num.length === 1) {
    result += '000000000000000000'
  } else {
    // const integerPart = num[0];
    const decimalPart = num[1]

    for (let i = 18; i > decimalPart.length; i -= 1) {
      result += '0'
    }
  }
  return result
}

export function generateVoteHash(salt: string, price: string, denom: string, voter: string) {
  const proof = `${salt}:${normalizeDecimal(price)}:${denom}:${voter}`
  const hash = sha256(proof).toString()

  return hash.slice(0, 40)
}

export function generateStdTx(msg: Record<string, unknown>[], fee: Fee, memo = ''): StdTx {
  return {
    fee,
    memo,
    msg,
    signatures: []
  }
}

export function generatePrevoteMsg(hash: string, denom: string, feeder: string, validator: string) {
  return {
    type: 'oracle/MsgPricePrevote',
    value: {
      hash,
      denom,
      feeder,
      validator
    }
  }
}

export function generateVote(price: string, salt: string, denom: string, feeder: string, validator: string) {
  return {
    type: 'oracle/MsgPriceVote',
    value: {
      price,
      salt,
      denom,
      feeder,
      validator
    }
  }
}

export function generateClaim(amount: string, userAddress: string, lpAddress: string, fromAddress: string) {
  return {
    type: 'claim/ClaimFunds',
    value: {
      amount: {
        amount,
        denom: 'don'
      },
      receiver_address: userAddress,
      target_address: lpAddress,
      from_address: fromAddress
    }
  }
}

export function generateSend(amount: string, fromAddress: string, toAddress: string) {
  return {
    type: 'cosmos-sdk/MsgSend',
    value: {
      amount: [
        {
          amount,
          denom: 'don'
        }
      ],
      from_address: fromAddress,
      to_address: toAddress
    }
  }
}

export interface Coin {
  denom: string
  amount: string
}

export interface InOut {
  address: string
  coins: Coin[]
}

export function generateMultiSend(inputs: InOut[], outputs: InOut[]) {
  return {
    type: 'bank/MsgMultiSend',
    value: {
      inputs,
      outputs
    }
  }
}
