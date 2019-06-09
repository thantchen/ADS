import * as sha256 from 'crypto-js/sha256'

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

export function generateStdTx(msg: object[], fee: object, memo: string) {
  return {
    type: 'auth/StdTx',
    value: {
      fee,
      memo,
      msg,
      signatures: null
    }
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

export function generateVoteMsg(price: string, salt: string, denom: string, feeder: string, validator: string) {
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

export function generateClaimMsg(amount: string, userAddress: string, lpAddress: string, fromAddress: string) {
  return {
    type: 'claim/ClaimFunds',
    value: {
      amount: {
        amount,
        denom: 'don',
      },
      receiver_address: userAddress,
      target_address: lpAddress,
      from_address: fromAddress
    }
  }
}

export function generateSendMsg(amount: string, fromAddress: string, toAddress: string) {
  return {
    type: 'cosmos-sdk/MsgSend',
    value: {
      amount: [{
        amount,
        denom: 'don',
      }],
      from_address: fromAddress,
      to_address: toAddress
    }
  }
}