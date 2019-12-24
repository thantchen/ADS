import * as http from 'http'
import * as https from 'https'
import * as util from 'util'
import axios from 'axios'
import * as Bluebird from 'bluebird'
import { StdTx, Coin } from './msg'

const ENDPOINT_QUERY_ACCOUNT = '/auth/accounts/%s'
const ENDPOINT_TX_BROADCAST = `/txs`
const ENDPOINT_TX_ESTIMATE_FEE = `/txs/estimate_fee`

const ax = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 30000,
  headers: {
    post: {
      'Content-Type': 'application/json'
    }
  }
})

export async function queryAccount(lcdAddress, address) {
  const url = util.format(lcdAddress + ENDPOINT_QUERY_ACCOUNT, address)
  const res = await ax.get(url)

  if (!res || res.status !== 200) {
    if (res) console.error(`Failed to bringing account number and sequence: ${res.statusText}`)
    throw new Error('status not 200')
  }

  const account = res.data.result.value

  if (account.address === '') {
    account.address = address
  }

  return account
}

export async function queryTaxRate(lcdAddress) {
  const { data } = await ax.get(`${lcdAddress}/treasury/tax_rate`)
  return data.result
}

// the broadcast body consists of the signed tx and a return type
// returnType can be block (inclusion in block), async (right away), sync (after checkTx has passed)
export function createBroadcastBody(tx: StdTx, mode: string = `sync`) {
  if (!['async', 'sync', 'block'].includes(mode)) {
    throw TypeError(`unknown broadcast mode ${mode}`)
  }

  return JSON.stringify({
    tx,
    mode
  })
}

export async function estimateTax(
  lcdAddress: string,
  tx: StdTx
): Promise<{
  fees: Coin[]
  gas: string
}> {
  const { data } = await ax.post(
    lcdAddress + ENDPOINT_TX_ESTIMATE_FEE,
    JSON.stringify({
      tx,
      gas_prices: [{ amount: '0.015', denom: 'ukrw' }],
      gas_adjustment: '1.4'
    })
  )

  return data.result
}

// This function throws error when tx has been written (has height) with error
// Otherwise it returns:
//     -1: failure
// height: success
export async function broadcast(lcdAddress: string, tx: StdTx, mode: string): Promise<number> {
  const body = createBroadcastBody(tx, mode)
  // Send broadcast
  const { data } = await ax.post(lcdAddress + ENDPOINT_TX_BROADCAST, body)

  if (data.code) {
    if (data.height !== '0') {
      throw new Error(`successful tx with error: ${data.raw_log}, hash: ${data.txhash}`)
    }

    console.error(`broadcast error: ${data.raw_log}`)
    return -1
  }

  // if broadcast mode is `block` return immediately.
  if (mode !== 'sync') {
    return data.height ? +data.height : -1
  }

  const AVERAGE_BLOCK_TIME = 6500
  const MAX_RETRY_COUNT = 10

  // Wait for next block
  await Bluebird.delay(AVERAGE_BLOCK_TIME)

  for (let i = 0; i < MAX_RETRY_COUNT; i += 1) {
    const height: string = await ax
      .get(`${lcdAddress}/txs/${data.txhash}`)
      .then(({ data: tx }) => {
        if (tx.code || (tx.logs && !tx.logs[0].success)) {
          throw new Error(`successful tx with error: ${tx.raw_log}, hash: ${data.txhash}`)
        }

        console.info(`txhash: ${tx.txhash}`)
        return tx.height
      })
      .catch(err => {
        if (err.isAxiosError && err.response.status === 404) {
          console.info(`tx not found yet: ${err.message}, hash: ${data.txhash}`)
          return ''
        }

        throw err
      })

    if (height) {
      return +height
    }

    await Bluebird.delay(AVERAGE_BLOCK_TIME)
  }

  return -1
}
