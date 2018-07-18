/* eslint-env mocha */

const { join } = require('path')
const chai = require('chai')
const express = require('express')
const Layer = require('express/lib/router/layer')
const supertest = require('supertest')
const jwt = require('jsonwebtoken')
const { errors } = require('backend-store')
const sinon = require('sinon')
const { addMiddleware } = require('graphql-add-middleware')
const loadGraphql = require('./../src/loadGraphql')
const createGraphqlApp = require('./../src/createGraphqlApp')

const expect = chai.expect

describe('createGraphqlApp', () => {
  it('work #1', async () => {
    const { agent } = createApp()
    const { body } = await agent
      .post('/')
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({
      'data': {
        'Post': {
          'create': {
            'result': null,
            'error': {
              'type': 'authentication',
              'severity': 'warning',
              'message': 'You have to login first',
              'reasons': null
            }
          }
        }
      }
    })
  })

  it('work #2', async () => {
    const { agent } = createApp()
    const { body } = await agent
      .post('/')
      .set('Authorization', getAuthHeader({ id: 2, role: 'admin' }))
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({
      'data': {
        'Post': {
          'create': {
            'result': {
              'post': {
                id: 1,
                title: 'abc',
                content: '123',
                userId: 2
              }
            },
            'error': null
          }
        }
      }
    })
  })

  it('work #3', async () => {
    const { agent } = createApp()
    const { body } = await agent
      .post('/')
      .set('Authorization', 'Bearer invalid_token')
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({
      'data': {
        'Post': {
          'create': {
            'result': null,
            'error': {
              'type': 'authentication',
              'severity': 'warning',
              'message': 'jwt malformed',
              'reasons': null
            }
          }
        }
      }
    })
  })

  it('work #4', async () => {
    const { agent, app } = createApp()

    unshiftMiddleware(app, '/', (req, res, next) => {
      next(new Error('test'))
    })

    const { body, statusCode } = await agent
      .post('/')
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({})
    expect(statusCode).to.equal(500)
  })

  it('support expressGraphql options', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const spy = sinon.spy()
    addMiddleware(schema, (root, args, context, info, next) => {
      spy(root)
      return next()
    })

    const { app } = createGraphqlApp(schema, {
      expressGraphql: {
        rootValue: 'xxx'
      }
    })
    const agent = supertest.agent(app)

    await agent
      .post('/')
      .send({
        query: `
          query {
            empty {
              result
            }
          }
        `
      })

    expect(spy.calledOnce).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal('xxx')
  })

  it('support expressGraphql options as function', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const { app } = createGraphqlApp(schema, {
      async expressGraphql () {
        return {
          rootValue: 'xxx'
        }
      }
    })
    const agent = supertest.agent(app)
    const spy = sinon.spy()
    addMiddleware(schema, (root, args, context, info, next) => {
      spy(root)
      return next()
    })
    await agent
      .post('/')
      .send({
        query: `
          query {
            empty {
              result
            }
          }
        `
      })

    expect(spy.calledOnce).to.equal(true)
    expect(spy.firstCall.args[0]).to.equal('xxx')
  })

  it('create app without options', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    const { app } = createGraphqlApp(schema)
    const agent = supertest.agent(app)
    const { body } = await agent
      .post('/')
      .send({
        query: `
          query {
            empty {
              result
            }
          }
        `
      })
  })

  it('no CORS by default', async () => {
    const { agent } = createApp({})
    const { headers } = await agent
      .options('/')
    expect(headers['access-control-allow-origin']).to.equal(undefined)
    expect(headers['access-control-allow-methods']).to.equal(undefined)
  })

  it('no JWT by default', async () => {
    const { agent } = createApp({ jwt: false })
    const { body } = await agent
      .post('/')
      .set('Authorization', getAuthHeader({ id: 2, role: 'admin' }))
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({
      'data': {
        'Post': {
          'create': {
            'result': null,
            'error': {
              'type': 'authentication',
              'severity': 'warning',
              'message': 'You have to login first',
              'reasons': null
            }
          }
        }
      }
    })
  })

  it('support cors #1', async () => {
    const { agent } = createApp({ cors: true })
    const { headers } = await agent
      .options('/')
    expect(headers['access-control-allow-origin']).to.equal('*')
    expect(headers['access-control-allow-methods']).to.equal('POST')
  })

  it('support cors #2', async () => {
    const { agent } = createApp({
      cors: {
        origin: 'http://example.com',
        methods: 'GET,POST'
      }
    })
    const { headers } = await agent
      .options('/')
    expect(headers['access-control-allow-origin']).to.equal('http://example.com')
    expect(headers['access-control-allow-methods']).to.equal('GET,POST')
  })

  it('allow to hande custom error', async () => {
    const { app, graphqlHTTP } = createApp({
      cors: {
        origin: 'http://example.com',
        methods: 'GET,POST'
      }
    })

    const rootApp = express()

    rootApp.use((req, res, next) => {
      next(new Error('custom_error_123'))
    })

    rootApp.use(app)
    rootApp.use('/graphql', app)

    rootApp.use((err, req, res, next) => {
      if (err.message === 'custom_error_123' && req.path === '/' && req.method.toLowerCase() === 'post') {
        req.appError = new errors.AuthenticationError({
          message: err.message
        })
        graphqlHTTP(req, res, next)
      } else if (err.message === 'custom_error_123' && req.path === '/graphql' && req.method.toLowerCase() === 'post') {
        req.appError = new errors.AuthenticationError({
          message: err.message + '_graphql'
        })
        graphqlHTTP(req, res, next)
      } else {
        next()
      }
    })

    const rootAgent = supertest.agent(rootApp)

    const { body } = await rootAgent
      .post('/')
      .set('Authorization', getAuthHeader({ id: 2, role: 'admin' }))
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })
    expect(body.data.Post.create).to.eql({
      result: null,
      error: {
        type: 'authentication',
        severity: 'warning',
        message: 'custom_error_123',
        reasons: null
      }
    })

    const { body: body2 } = await rootAgent
      .post('/graphql')
      .set('Authorization', getAuthHeader({ id: 2, role: 'admin' }))
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body2.data.Post.create).to.eql({
      result: null,
      error: {
        type: 'authentication',
        severity: 'warning',
        message: 'custom_error_123_graphql',
        reasons: null
      }
    })
  })

  it('support mounting to other app', async () => {
    const { app: graphqlApp } = createApp({
      cors: {
        origin: 'http://example.com'
      }
    })
    const app = express()
    app.use('/graphql', graphqlApp)
    const agent = supertest.agent(app)

    const { headers } = await agent
      .options('/graphql')
    expect(headers['access-control-allow-origin']).to.equal('http://example.com')
    expect(headers['access-control-allow-methods']).to.equal('POST')

    const { body } = await agent
      .post('/graphql')
      .set('Authorization', getAuthHeader({ id: 2, role: 'admin' }))
      .send({
        query: `
        query ($input: PostCreateInput!) {
          Post {
            create (input: $input) {
              result {
                post { id, title, content, userId }
              }
              error { type, severity, message, reasons { path, message } }
            }
          }
        }
      `,
        variables: {
          input: {
            title: 'abc',
            content: '123'
          }
        }
      })

    expect(body).to.eql({
      'data': {
        'Post': {
          'create': {
            'result': {
              'post': {
                id: 1,
                title: 'abc',
                content: '123',
                userId: 2
              }
            },
            'error': null
          }
        }
      }
    })
  })

  it('throw error on invalid options argument', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    expect(() => {
      createGraphqlApp(schema, null)
    }).to.throw('Expected `options` to be of type `object` but received type `null`')
  })

  it('throw error on invalid options.cors', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    expect(() => {
      createGraphqlApp(schema, { cors: 'abc' })
    }).to.throw('Any predicate failed with the following errors:\n- Expected argument to be of type `boolean` but received type `string`\n- Expected argument to be of type `object` but received type `string`')
  })

  it('throw error on invalid options.jwt', async () => {
    const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
    expect(() => {
      createGraphqlApp(schema, { jwt: 'abc' })
    }).to.throw('Expected `options.jwt` to be of type `object` but received type `string`')
  })
})

function createApp (options = {}) {
  const schema = loadGraphql(join(__dirname, 'testApp', 'graphql'))
  const { app, graphqlHTTP } = createGraphqlApp(schema, {
    jwt: options.jwt != null ? options.jwt : { secret: 'abc' },
    ...options
  })
  const agent = supertest.agent(app)
  return { agent, schema, app, graphqlHTTP }
}

function getAuthHeader (userData) {
  const token = jwt.sign(userData, 'abc')
  return `Bearer ${token}`
}

function unshiftMiddleware (app, path, fn) {
  const router = app._router
  const layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: false,
    end: false
  }, fn)
  layer.route = undefined
  router.stack.unshift(layer)
}
