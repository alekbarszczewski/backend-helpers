const express = require('express')
const createGraphqlApp = require('./../../src/createGraphqlApp')
const executableSchema = require('./graphql')

const { app: graphqlApp } = createGraphqlApp(executableSchema, {
  jwt: { secret: 'test' }
})

const app = express()

app.use('/graphql', graphqlApp)

app.listen(5000)
