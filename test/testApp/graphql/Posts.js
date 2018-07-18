const { errors } = require('backend-store')
const store = require('./../store')

module.exports.typeDefs = `
  type Post {
    id: Int!
    title: String!
    content: String!
    userId: Int!
  }

  input PostCreateInput {
    title: String!
    content: String!
  }

  type PostCreateResult {
    post: Post!
  }

  type PostCreateOutput {
    result: PostCreateResult
    error: Error
  }

  type PostQuery {
    create (input: PostCreateInput!): PostCreateOutput!
    throwCustomError: EmptyOutput
    throwValidationError: EmptyOutput
  }

  type TestResult {
    json: JSON!
    dateTime: DateTime!
    date: Date!
    time: Time!
  }

  type Empty {
    result: String
  }

  type TestOutput {
    result: TestResult!
  }

  type Query {
    Post: PostQuery
    test: TestOutput!
    empty: Empty
  }
`

module.exports.resolvers = {
  Query: {
    Post () {
      return {}
    },
    test () {
      return {
        json: { a: { b: { c: 1 } } },
        dateTime: new Date(0),
        time: new Date(0),
        date: new Date(0)
      }
    },
    empty () {
      return 'abc'
    }
  },
  PostQuery: {
    async create (root, args, context, info) {
      return {
        post: await store.dispatch('api/posts/create', args.input, context)
      }
    },

    throwCustomError () {
      throw Error('test')
    },

    throwValidationError () {
      throw new errors.ValidationError().addReason({ path: 'a', message: 'b' })
    }
  }
}
