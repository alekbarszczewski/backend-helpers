const express = require('express')
const cors = require('cors')
const expressJwt = require('express-jwt')
const graphqlHTTP = require('express-graphql')
const { errors } = require('backend-store')

module.exports = function createGraphqlApp (graphqlSchema, options = {}) {
  const app = express()

  const graphql = graphqlHTTP({
    schema: graphqlSchema,
    graphiql: false
  })

  const corsMiddleware = cors({
    methods: 'POST',
    ...options.cors
  })

  app.options('/', corsMiddleware)

  app.use(expressJwt({
    credentialsRequired: false,
    ...options.jwt
  }))

  app.post('/', corsMiddleware, graphql)

  app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError' && req.path === '/' && req.method.toLowerCase() === 'post') {
      req.appError = new errors.AuthenticationError({
        message: err.message
      })
      graphql(req, res, next)
    } else {
      next()
    }
  })

  return { app, graphqlHTTP: graphql }
}
