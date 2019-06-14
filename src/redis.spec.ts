import redis, { Queue } from 'redis'

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
    expect(await Queue.len('test_queue')).toBe(0)
  })

  test('multiple push', async () => {
    await Queue.push(
      'test_queue',
      { userId: '1', amount: '4321' },
      { userId: '2', amount: '4321' },
      { userId: '3', amount: '4321' },
      { userId: '4', amount: '4321' },
      { userId: '5', amount: '4321' },
      { userId: '6', amount: '4321' },
      { userId: '7', amount: '4321' },
      { userId: '8', amount: '4321' },
      { userId: '9', amount: '4321' },
      { userId: '10', amount: '4321' }
    )

    let list = await Queue.peek('test_queue', 10)

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(10)

    await Queue.trim('test_queue', 5)
    list = await Queue.peek('test_queue', 5)
    expect(list.length).toBe(5)
    expect(list[0].userId).toBe('6')
  })
})
