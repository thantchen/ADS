import * as http from 'http'
import * as Bluebird from 'bluebird'
import * as sentry from '@sentry/node'
import * as polka from 'polka'
import { json } from 'body-parser'
import * as config from 'config'
import { errorHandler } from 'lib/error'
import claim from 'controllers/claim'

Bluebird.config({
  longStackTraces: true
})

global.Promise = <any>Bluebird

process.on('unhandledRejection', err => {
  sentry.captureException(err)
  throw err
})

const app = polka({})

app.use(json())
app.use(errorHandler)

app.get('/health', (req, res) => {
  res.end('OK')
})

app.use('/claim', claim)

if (require.main === module) {
  const server = http.createServer(app.handler)

  server.listen(config.port, () => {
    console.log(`> Listening on port ${config.port}`)
  })
}

export default app
