module.exports = {
  port: 9000,
  db: {
    tempura: {
      path: 'data/tempura'
    },
    terra: {
      path: 'data/terra'
    }
  },
  queue: {
    name: 'lp:dev'
  }
}
