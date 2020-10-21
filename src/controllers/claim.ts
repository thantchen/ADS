import * as polka from 'polka'
import { Queue } from 'redis'
import * as config from 'config'
import { Big } from 'big.js'
import { success } from 'lib/response'
import { APIError } from 'lib/error'

const app = polka()

function parseClaimBody(
  body: any
): {
  from: string
  to: string
  amount: Big
} {
  const { from, to } = body

  if (typeof from !== 'string' || !from) {
    throw new APIError(400, 'invalid from')
  }

  if (typeof to !== 'string' || !to) {
    throw new APIError(400, 'invalid to')
  }

  try {
    const amount = new Big(body.amount)
    return { from, to, amount }
  } catch (e) {
    throw new APIError(400, e.message)
  }
}

// POST /claim/don
app.post('/don', async (req, res) => {
  const { from, to, amount } = parseClaimBody(req.body)
  const at = new Date()

  await Queue.push(config.queue.name, {
    denom: 'ukrw',
    from,
    to,
    // body의 amount는 KRW 단위이므로 ukrw로 바꿔준다.
    amount: amount.mul(1000000).toString(),
    at
  })

  return success(res)
})

// POST /claim/krw
app.post('/krw', async (req, res) => {
  const { from, to, amount } = parseClaimBody(req.body)
  const at = new Date()

  await Queue.push(config.queue.name, {
    denom: 'ukrw',
    from,
    to,
    // body의 amount는 KRW 단위이므로 ukrw로 바꿔준다.
    amount: amount.mul(1000000).toString(),
    at
  })

  return success(res)
})

export default app
