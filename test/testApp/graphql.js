const { join } = require('path')
const loadGraphql = require('./../../src/loadGraphql')

const executableSchema = loadGraphql(join(__dirname, 'graphql'), {})

module.exports = executableSchema
