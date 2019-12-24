import * as Bluebird from 'bluebird'
import * as IORedis from 'ioredis'
import * as config from 'config'

const redis = new IORedis(config.redis)

export class Queue {
  static async push(queueName: string, ...values: any[]) {
    return redis.rpush(queueName, ...values.map(v => JSON.stringify(v)))
  }

  static async lpush(queueName: string, ...values: any[]) {
    return redis.lpush(queueName, ...values.map(v => JSON.stringify(v)))
  }

  static async pop(queueName: string) {
    return JSON.parse(await redis.lpop(queueName))
  }

  static async peek(queueName: string, limit: number) {
    const values = await redis.lrange(queueName, 0, limit - 1)
    return values.map(v => v && v !== 'deleted' && JSON.parse(v)).filter(Boolean)
  }

  static async trim(queueName: string, limit: number) {
    await redis.ltrim(queueName, limit, -1)
  }

  static async len(queueName: string) {
    return redis.llen(queueName)
  }

  static async delete(queueName: string, indexes: number[]) {
    await Bluebird.map(indexes, idx => redis.lset(queueName, idx, 'deleted'))
    return redis.lrem(queueName, 0, 'deleted')
  }
}

export default redis
