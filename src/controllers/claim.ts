import * as polka from 'polka'
import { Queue } from 'redis'
import * as validateUUID from 'uuid-validate'
import { success, error } from 'lib/response'
import { APIError } from 'lib/error'

const app = polka()

const parseClaimBody = body => {
  const { userId, merchantId } = body

  if (!userId || !validateUUID(userId)) {
    throw new APIError(400, 'invalid userId')
  }

  if (!merchantId || !validateUUID(merchantId)) {
    throw new APIError(400, 'invalid merchantId')
  }

  const amount = +body.amount

  if (Number.isNaN(amount) || amount <= 0) {
    throw new APIError(400, 'invalid amount')
  }

  return { userId, merchantId, amount }
}

// claim don
app.post('/don', async (req, res) => {
  const { userId, merchantId, amount } = parseClaimBody(req.body)

  await Queue.push('lp:claim_queue', { ask: 'don', userId, merchantId, amount, at: new Date() })
  return success(res)
})

// claim krw
app.post('/krw', async (req, res) => {
  const { userId, merchantId, amount } = parseClaimBody(req.body)

  await Queue.push('lp:claim_queue', { ask: 'krw', userId, merchantId, amount, at: new Date() })
  return success(res)
})

export default app
