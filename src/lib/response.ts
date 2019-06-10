export function success(res, response?: any) {
  res.end(response && JSON.stringify(response))
}

export function error(res, statusCode: number, response: any) {
  res.statusCode = statusCode
  res.end(JSON.stringify(response))
}
