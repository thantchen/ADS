import redis, { Queue } from 'redis';

describe('redis', () => {
  beforeAll(async done => {
    await redis.del('test_queue')
    done()
  })

  afterAll(() => {
    redis.disconnect()
  })

  test('queue basic integrity', async () => {
    const randomValue = Math.random()

    await Queue.push('test_queue', { randomValue })
    expect(await Queue.pop('test_queue')).toMatchObject({ randomValue })
  })

  test('multiple push', async () => {
    for (let i = 0; i < 10; i += 1) {
      await Queue.push('test_queue', { userId: '1234', amount: '4321' })
    }

    let list = await Queue.peek('test_queue', 10);

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(10)

    await Queue.trim('test_queue', 10)
    list = await Queue.peek('test_queue', 10)
    expect(list.length).toBe(0)
  })
})