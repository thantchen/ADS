import * as Bluebird from 'bluebird'
import redis, { Queue } from 'redis'
import * as level from 'level'
import * as config from 'config'
import { ArgumentParser } from 'argparse'
import * as CryptoJS from 'crypto-js'
import { isEqual } from 'lodash'
import * as keystore from 'lib/keystore'
import * as client from 'lib/client'
import * as transaction from 'lib/transaction'
import { InOut, generateMultiSend, generateStdTx } from 'lib/msg'

const SEND_QUEUE_NAME = 'lp:terra:send'

interface QueueElem {
  from: string
  inputs: InOut[]
  outputs: InOut[]
  userIds?: string[]
}

export default async function mergeSendQueue() {
  const values = await Queue.peek(SEND_QUEUE_NAME, 100)

  // first one must be lp > user
  if (values.length < 2 || (values[0].from !== 'lp' && values[1].from !== 'user')) {
    console.info('mergeSendQueue: first and seond one must be pair')
    return
  }

  // early exit if inputs has more than 50
  if (values[0].inputs.length > 50) {
    return
  }

  // slice to even number of elements
  if (values.length % 2) {
    values.length -= 1
  }

  const fromLP: QueueElem = {
    from: 'lp',
    inputs: [],
    outputs: []
  }

  const fromUser: QueueElem = {
    from: 'user',
    inputs: [values[1].inputs[0]],
    outputs: [values[1].inputs[0]],
    userIds: []
  }

  let len = 0

  for (let idx = 0; idx < values.length; idx += 2) {
    const lp: QueueElem = values[idx]
    const user: QueueElem = values[idx + 1]

    if (lp.from !== 'lp' || user.from !== 'user') {
      throw new Error('it is not paired!')
    }

    if (fromLP.inputs.length + lp.inputs.length > 50) {
      break
    }

    // Merge queue for lp to users
    fromLP.inputs.push(...lp.inputs)
    fromLP.outputs.push(...lp.outputs)

    // Merge queue for users to lp
    fromUser.inputs.push(...user.inputs.slice(1, user.inputs.length))
    fromUser.outputs.push(...user.outputs.slice(1, user.outputs.length))
    if (fromUser.userIds && user.userIds) fromUser.userIds.push(...user.userIds)

    len += 2
  }

  fromLP.outputs.forEach(({ address, coins }, index) => {
    const u = fromUser.inputs[index + 1]

    if (u.address !== address || !isEqual(u.coins, coins)) {
      console.log(u, address, coins)
      throw new Error('validation error! lp user pair mismatched!')
    }
  })

  console.info(`mergeSendQueue: ${len}`)

  // trim queue
  await Queue.trim(SEND_QUEUE_NAME, len)
  // lpush inserts last argument to the beginning
  await Queue.lpush(SEND_QUEUE_NAME, fromUser, fromLP)
}
