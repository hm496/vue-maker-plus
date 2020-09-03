function createWhenTs (params) {
  return params.typescript ? true : false
}

const handler = {
  '/tsconfig.json': createWhenTs
}

module.exports = {
  handler
}
