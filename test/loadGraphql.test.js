/* eslint-env mocha */

const { join } = require('path')
const chai = require('chai')
const { graphql } = require('graphql')
const selectn = require('selectn')
const { errors } = require('backend-store')
const loadGraphql = require('./../src/loadGraphql')

const expect = chai.expect

describe('loadGraphql', () => {
  it('default typeDefs', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))

    const ErrorType = schema._typeMap.ErrorType
    expect(ErrorType._enumConfig.name).to.equal('ErrorType')
    expect(ErrorType._enumConfig.values).to.have.all.keys([
      'internal',
      'authentication',
      'authorization',
      'notFound',
      'notImplemented',
      'validation'
    ])

    const ErrorSeverity = schema._typeMap.ErrorSeverity
    expect(ErrorSeverity._enumConfig.name).to.equal('ErrorSeverity')
    expect(ErrorSeverity._enumConfig.values).to.have.all.keys([
      'error',
      'warning'
    ])

    const Error = schema._typeMap.Error
    expect(Error._typeConfig.name).to.equal('Error')
    expect(Error._fields.type.name).to.equal('type')
    expect(Error._fields.type.type.toString()).to.equal('ErrorType!')
    expect(Error._fields.severity.name).to.equal('severity')
    expect(Error._fields.severity.type.toString()).to.equal('ErrorSeverity!')
    expect(Error._fields.message.name).to.equal('message')
    expect(Error._fields.message.type.toString()).to.equal('String!')
    expect(Error._fields.reasons.name).to.equal('reasons')
    expect(Error._fields.reasons.type.toString()).to.equal('[ErrorReason!]')

    const EmptyOutput = schema._typeMap.EmptyOutput
    expect(EmptyOutput._typeConfig.name).to.equal('EmptyOutput')
    expect(EmptyOutput._fields.error.name).to.equal('error')
    expect(EmptyOutput._fields.error.type.toString()).to.equal('Error')

    const query = `
      query {
        test {
          result {
            json
            dateTime
            date
            time
          }
        }
      }
    `
    const result = await graphql(schema, query)

    expect(result.data.test.result).to.eql({
      json: {
        a: {
          b: {
            c: 1
          }
        }
      },
      dateTime: '1970-01-01T00:00:00.000Z',
      date: '1970-01-01',
      time: '00:00:00.000Z'
    })
  })

  it('result format', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query ($input: PostCreateInput!) {
        Post {
          create (input: $input) {
            result {
              post {
                id
                title
                content
                userId
              }
            }
          }
        }
      }
    `
    const variables = {
      input: {
        title: 'abc',
        content: '123'
      }
    }
    const result = await graphql(
      schema,
      query,
      null,
      { user: { id: 1, role: 'admin' } },
      variables
    )

    expect(selectn('data.Post.create.result.post', result)).to.eql({
      id: 1,
      title: 'abc',
      content: '123',
      userId: 1
    })
  })

  it('error format', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query ($input: PostCreateInput!) {
        Post {
          create (input: $input) {
            result {
              post {
                id
                title
                content
                userId
              }
            }
            error {
              type
              severity
              message
              reasons {
                path
                message
                reason
              }
            }
          }
        }
      }
    `
    const variables = {
      input: {
        title: 'abc',
        content: '123'
      }
    }
    const result = await graphql(
      schema,
      query,
      null,
      null,
      variables
    )

    expect(selectn('data.Post.create.error', result)).to.eql({
      type: 'authentication',
      message: 'You have to login first',
      reasons: null,
      severity: 'warning'
    })
  })

  it('wrap errors #1', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query {
        Post {
          throwCustomError {
            error {
              type
              severity
              message
              reasons {
                path
                message
                reason
              }
            }
          }
        }
      }
    `
    const result = await graphql(
      schema,
      query
    )

    expect(selectn('data.Post.throwCustomError.error', result)).to.eql({
      type: 'internal',
      message: 'Internal error',
      reasons: null,
      severity: 'error'
    })
  })

  it('wrap errors #2', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query {
        Post {
          throwValidationError {
            error {
              type
              severity
              message
              reasons {
                path
                message
                reason
              }
            }
          }
        }
      }
    `
    const result = await graphql(
      schema,
      query
    )

    expect(selectn('data.Post.throwValidationError.error', result)).to.eql({
      type: 'validation',
      message: 'Validation error',
      reasons: [{ path: 'a', message: 'b', reason: null }],
      severity: 'warning'
    })
  })

  it('throw appError #1', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query {
        Post {
          throwValidationError {
            error {
              type
              severity
              message
              reasons {
                path
                message
                reason
              }
            }
          }
        }
      }
    `
    const result = await graphql(
      schema,
      query,
      null,
      { appError: new Error('test') }
    )

    expect(selectn('data.Post.throwValidationError.error', result)).to.eql({
      type: 'internal',
      message: 'Internal error',
      severity: 'error',
      reasons: null
    })
  })

  it('throw appError #1', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const query = `
      query {
        Post {
          throwValidationError {
            error {
              type
              severity
              message
              reasons {
                path
                message
                reason
              }
            }
          }
        }
      }
    `
    const result = await graphql(
      schema,
      query,
      null,
      { appError: new errors.AuthenticationError('test') }
    )

    expect(selectn('data.Post.throwValidationError.error', result)).to.eql({
      type: 'authentication',
      message: 'test',
      severity: 'warning',
      reasons: null
    })
  })
})
