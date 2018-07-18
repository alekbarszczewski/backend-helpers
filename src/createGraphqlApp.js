const express = require('express')
const cors = require('cors')
const expressJwt = require('express-jwt')
const graphqlHTTP = require('express-graphql')
const { errors } = require('backend-store')
const ow = require('ow')

module.exports = function createGraphqlApp (graphqlSchema, options = {}) {
  ow(options, ow.object.label('options'))

  const expressGraphqlOptions = options.expressGraphql || {}

  const app = express()

  const graphql = graphqlHTTP(async (request, response, graphQLParams) => {
    const requestOptions = typeof expressGraphqlOptions === 'function'
      ? (await expressGraphqlOptions(request, response, graphQLParams))
      : expressGraphqlOptions
    return {
      schema: graphqlSchema,
      graphiql: false,
      context: request,
      ...requestOptions
    }
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
      next(err)
    }
  })

  return { app, graphqlHTTP: graphql }
}
