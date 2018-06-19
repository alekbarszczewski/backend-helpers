const { addMiddleware } = require('graphql-add-middleware')
const { loadModules } = require('graphql-schema-modules')
const { makeExecutableSchema } = require('graphql-tools')
const { errors } = require('backend-store')
const { GraphQLDate, GraphQLTime, GraphQLDateTime } = require('graphql-iso-date')
const GraphQLJSON = require('graphql-type-json')

module.exports = function loadGraphql (path, options = {}) {
  const { typeDefs, resolvers } = loadModules(path)

  typeDefs.push(getDefaultTypeDefs())
  Object.assign(resolvers, getDefaultResolvers())

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  addMiddleware(schema, async function (root, args, context, info, next) {
    try {
      if (context && context.appError) {
        throw context.appError
      }
      return {
        result: await next()
      }
    } catch (err) {
      const wrappedError = errors.wrapError(err)
      return {
        error: wrappedError.toJSON()
      }
    }
  })

  return schema
}

function getDefaultTypeDefs () {
  return `
    enum ErrorType { internal, authentication, authorization, notFound, notImplemented, validation }
    enum ErrorSeverity { error, warning }

    type ErrorReason {
      path: String!
      message: String!
      reason: String
    }

    type Error {
      type: ErrorType!
      severity: ErrorSeverity!
      message: String!
      reasons: [ErrorReason!]
    }

    type EmptyOutput {
      error: Error
    }

    scalar DateTime
    scalar Date
    scalar Time
    scalar JSON
  `
}

function getDefaultResolvers () {
  return {
    DateTime: GraphQLDateTime,
    Time: GraphQLTime,
    Date: GraphQLDate,
    JSON: GraphQLJSON
  }
}
