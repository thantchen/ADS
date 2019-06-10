import * as sentry from '@sentry/node'
import { error } from 'lib/response'

export class APIError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super()
    this.statusCode = statusCode
    this.message = message
  }
}

export const errorHandler = async (req, res, next) => {
  try {
    if (next) await next()
  } catch (err) {
    if (err instanceof APIError) {
      error(res, err.statusCode, err.message)
    } else {
      sentry.captureException(err)
      console.error(err)
    }
  }
}
