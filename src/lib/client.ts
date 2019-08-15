import * as http from 'http'
import * as https from 'https'
import * as util from 'util'
import axios from 'axios'
import * as Bluebird from 'bluebird'

const debug = require('debug')('lp-server:terra')

const ENDPOINT_QUERY_ACCOUNT = '/auth/accounts/%s'
const ENDPOINT_TX_BROADCAST = `/txs`

const ax = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 30000
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

  if (Number.isNaN(+data.tax_rate)) {
    throw new Error('invalid tax rate response')
  }

  return +data.tax_rate
}

export async function broadcast(lcdAddress: string, account: { sequence: string }, body: any): Promise<number> {
  debug(body)

  // Send broadcast
  const { data } = await ax.post(lcdAddress + ENDPOINT_TX_BROADCAST, body).catch(e => {
    if (e.response) return e.response
    throw e
  })

  if (!data.txhash) {
    console.error('cannot find txhash', data)
    return 0
  }

  const AVERAGE_BLOCK_TIME = 6500
  const MAX_RETRY_COUNT = 5

  for (let i = 0; i < MAX_RETRY_COUNT; i += 1) {
    try {
      // Wait block time
      await Bluebird.delay(AVERAGE_BLOCK_TIME)

      const { data: tx } = await ax.get(`${lcdAddress}/txs/${data.txhash}`)
      let height = 0

      if (tx.code) {
        console.error(`broadcast has error:`, tx.raw_log)
      } else if (tx.logs && !tx.logs[0].success) {
        console.error('broadcast sent, but failed:', tx.logs)
      } else {
        console.info(`txhash: ${tx.txhash}`)
        height = +tx.height
      }

      account.sequence = (parseInt(account.sequence, 10) + 1).toString()
      return height
    } catch (err) {
      // Wait block time
      console.info(`tx not found yet: ${err.message}, hash: ${data.txhash}`)
    }
  }

  return 0
}
