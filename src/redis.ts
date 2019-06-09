import * as IORedis from 'ioredis'
import * as config from 'config'

const redis = new IORedis(config.redis)

export class Queue {
  static async push(queueName: string, data: object) {
    return redis.rpush(queueName, JSON.stringify(data))
  }

  static async pop(queueName: string) {
    return JSON.parse(await redis.lpop(queueName))
  }

  static async peek(queueName: string, limit: number) {
    return redis.lrange(queueName, 0, limit - 1).then(arr => arr.map(JSON.parse))
  }

  static async trim(queueName: string, limit: number) {
    await redis.ltrim(queueName, limit + 1, -1)
  }
}

export default redis
