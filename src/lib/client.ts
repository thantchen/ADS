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

export async function queryAccount({ lcdAddress, address }) {
  const url = util.format(lcdAddress + ENDPOINT_QUERY_ACCOUNT, address)
  console.info(`querying: ${url}`)

  const res = await ax.get(url).catch(e => {
    console.error(`Failed to bringing account number and sequence: ${e.toString()}`)
    return
  })

  if (!res || res.status !== 200) {
    if (res) console.error(`Failed to bringing account number and sequence: ${res.statusText}`)
    return
  }

  return res.data.value
}

export async function broadcast({ lcdAddress, account, body }): Promise<number> {
  // Send broadcast
  const { data } = await ax.post(lcdAddress + ENDPOINT_TX_BROADCAST, body).catch(e => {
    if (e.response) return e.response
    throw e
  })

  if (data.code !== undefined) {
    console.error('broadcast failed:', data.logs)
    return 0
  }

  if (data.logs && !data.logs[0].success) {
    console.error('broadcast sent, but failed:', data.logs)
  } else if (data.error) {
    console.error('broadcast raised an error:', data.error)
  } else {
    console.info(`txhash: ${data.txhash}`)
  }

  account.sequence = (parseInt(account.sequence, 10) + 1).toString()
  return +data.height
}
