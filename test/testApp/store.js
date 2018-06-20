const { join } = require('path')
const loadStore = require('./../../src/loadStore')

const store = loadStore({
  loadMethods: { path: join(__dirname, 'store') }
})

module.exports = store
