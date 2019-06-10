import * as http from 'http'
import * as https from 'https'
import * as util from 'util'
import axios from 'axios'

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

export async function broadcast(lcdAddress, account, body): Promise<number> {
  // Send broadcast
  const { data } = await ax.post(lcdAddress + ENDPOINT_TX_BROADCAST, body).catch(e => {
    if (e.response) return e.response
    throw e
  })

  if (data.code !== undefined) {
    console.error('broadcast failed:', data.logs)
    return 0
  }

  let height = 0

  if (data.logs && !data.logs[0].success) {
    console.error('broadcast sent, but failed:', data.logs)
    account.sequence = (parseInt(account.sequence, 10) + 1).toString()
  } else if (data.error) {
    console.error('broadcast raised an error:', data.error)

    try { 
      const error = JSON.parse(data.error)

      if (error.code !== 4) {
        throw new Error(error.message)
      }
    } catch (err) {
      throw err
    }
  } else {
    console.info(`txhash: ${data.txhash}`)
    height = +data.height
    account.sequence = (parseInt(account.sequence, 10) + 1).toString()
  }

  return height
}
