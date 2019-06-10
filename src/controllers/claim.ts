import * as polka from 'polka'
import { Queue } from 'redis'
import * as validateUUID from 'uuid-validate'
import { success, error } from 'lib/response'
import { APIError } from 'lib/error'
import * as uuid from 'uuid'

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

  // TODO: 현재 차이에서 포인트 충전이 따로 없이 충전한 모든 금액을 바로 사용하고 있기 때문에,
  // 사용자 지갑에 갔다가 바로 다시 LP지갑으로 회수한다. 잔여 포인트라는 개념이 생길 경우 구현 필요
  await Queue.push('lp:terra:queue', {
    id: uuid(),
    denom: 'ukrw',
    userId,
    merchantId,
    amount: (amount * 1000000).toString(),
    at: new Date()
  })

  await Queue.push('lp:tempura:queue', {
    id: uuid(),
    denom: 'don',
    userId,
    merchantId,
    amount: amount.toString(),
    at: new Date()
  })

  return success(res)
})

// claim krw
app.post('/krw', async (req, res) => {
  const { userId, merchantId, amount } = parseClaimBody(req.body)

  const value = { id: uuid(), ask: 'krw', userId, merchantId, amount, at: new Date() }

  // TODO: 현재는 잔여 포인트가 없기 때문에 queue 처리 필요 없지만, 생길 경우 구현 필요
  // await Queue.push('lp:terra:queue', value)
  await Queue.push('lp:tempura:queue', value)
  return success(res)
})

export default app
