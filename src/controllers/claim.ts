import * as polka from 'polka'
import { Queue } from 'redis'

const app = polka()

app.post('/', async (req, res) => {
  await Queue.push('lp:claim_queue', res.body)
  res.end()
})

export default app