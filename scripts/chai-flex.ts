import * as fs from 'fs';
import * as csv from 'fast-csv';
import { Big } from 'big.js';
import redis, { Queue } from 'redis'

const cashbacks = new Map()

fs.createReadStream('/data/terra/chai_flex_oct.csv')
  .pipe(csv.parse({ headers: true }))
  .on('error', error => console.error(error))
  .on('data', row => {
    if (row.amount === '0') {
      return
    }
 
    const c = cashbacks.get(row.user_id)
    cashbacks.set(row.user_id, c ? c.plus(row.amount) : new Big(row.amount))
  })
  .on('end', async (rowCount: number) => {
    const entries = cashbacks.entries()

    console.log(cashbacks.size)
    /*
    for (const entry of entries) {
      await Queue.lpush('lp:prod', {
        denom: 'ukrw',
        from: 'lp',
        to: entry[0],
        amount: entry[1].times(1000000).toString(),
        at: new Date().toISOString()
      })
    }
    */
    await redis.disconnect()
  })
