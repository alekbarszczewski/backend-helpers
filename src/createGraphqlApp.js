const express = require('express')
const cors = require('cors')
const expressJwt = require('express-jwt')
const graphqlHTTP = require('express-graphql')
const { errors } = require('backend-store')
const ow = require('ow')

module.exports = function createGraphqlApp (graphqlSchema, options = {}) {
  ow(options, ow.object.label('options'))

  const app = express()

  const graphql = graphqlHTTP({
    schema: graphqlSchema,
    graphiql: false
  })

  let corsMiddleware

  if (options.cors) {
    ow(options.cors, ow.any(ow.boolean, ow.object))
    corsMiddleware = cors({
      methods: 'POST',
      ...options.cors
    })
    app.options('/', corsMiddleware)
  }

  if (options.jwt) {
    ow(options.jwt, ow.object.label('options.jwt'))
    app.use(expressJwt({
      credentialsRequired: false,
      ...options.jwt
    }))
  }

  const handlers = [ graphql ]
  if (corsMiddleware) {
    handlers.unshift(corsMiddleware)
  }
  app.post('/', handlers)

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
