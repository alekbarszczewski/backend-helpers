const { join } = require('path')
const loadStore = require('./../../src/loadStore')

const store = loadStore(join(__dirname, 'store'), {})

module.exports = store
