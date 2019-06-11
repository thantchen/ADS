import * as http from 'http'
import * as https from 'https'
import * as util from 'util'
import axios from 'axios'
import delay from 'delay'
import { consoleSandbox } from '@sentry/utils';

const ENDPOINT_QUERY_ACCOUNT = '/auth/accounts/%s'
const ENDPOINT_TX_BROADCAST = `/txs`

const ax = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 15000
})

export async function queryAccount(lcdAddress, address) {
  const url = util.format(lcdAddress + ENDPOINT_QUERY_ACCOUNT, address)
  const res = await ax.get(url)

  if (!res || res.status !== 200) {
    if (res) console.error(`Failed to bringing account number and sequence: ${res.statusText}`)
    throw new Error('status not 200')
  }

  const account = res.data.value

  if (account.address === '') {
    account.address = address
  }

  return account
}

export async function queryTaxRate(lcdAddress) {
  const { data } = await ax.get(`${lcdAddress}/treasury/tax-rate`)

  if (Number.isNaN(+data)) {
    throw new Error('invalid tax rate response')
  }

  return +data
}

export async function queryTx(lcdAddress: string, txHash: string) {
  const { data } = await ax.get(`${lcdAddress}/txs/${txHash}`)

  if (!data || Number.isNaN(+data.height)) {
    return data
  }
}

export async function broadcast(lcdAddress: string, account: {sequence: string}, body: any): Promise<number> {
  // Send broadcast
  const { data } = await ax.post(lcdAddress + ENDPOINT_TX_BROADCAST, body).catch(e => {
    if (e.response) return e.response
    throw e
  })

  const AVERAGE_BLOCK_TIME = 6000;
  const MAX_RETRY_COUNT = 3;
  for (let i = 0; i < MAX_RETRY_COUNT; i+=1) {

    try {

      // Wait block time
      await delay(AVERAGE_BLOCK_TIME);

      const tx = await queryTx(lcdAddress, data.txhash)

      if (tx.code !== undefined) {
        console.error('broadcast failed:', tx.logs)
        return 0
      }
    
      let height = 0
      if (tx.logs && !tx.logs[0].success) {
        console.error('broadcast sent, but failed:', tx.logs)
      } else {
        console.info(`txhash: ${tx.txhash}`)
        height = +tx.height
      }

      account.sequence = (parseInt(account.sequence, 10) + 1).toString()

      return height;

    } catch {
      
      // Wait block time
      console.info(`tx not found yet`)

    }

  }
  
  return 0;
}
