/* eslint-env mocha */

const { join } = require('path')
const chai = require('chai')
const { errors } = require('backend-store')
const sinon = require('sinon')
const CaptureStdout = require('capture-stdout')
const loadStore = require('./../src/loadStore')

chai.use(require('chai-as-promised'))

const expect = chai.expect

describe('loadStore', () => {
  it('load methods', async () => {
    const store = loadStore({
      loadMethods: { path: join(__dirname, 'testApp', 'store') }
    })
    const result = await store.dispatch('api/posts/create', {
      title: 'abc',
      content: '123'
    }, { user: { id: 2, role: 'admin' } })
    expect(result).to.eql({
      id: 1,
      title: 'abc',
      content: '123',
      userId: 2
    })
  })

  it('methodContext', async () => {
    const methodContext = {
      a: {},
      b: '123',
      cid: 'abc'
    }
    const store = loadStore({
      loadMethods: { path: join(__dirname, 'testApp', 'store') },
      methodContext
    })

    const spy = sinon.spy()
    store.define('test', spy)

    await store.dispatch('test')

    expect(spy.calledOnce).to.equal(true)
    const [ , ctx ] = spy.firstCall.args
    expect(ctx.a).to.equal(methodContext.a)
    expect(ctx.b).to.equal('123')
    expect(ctx.cid).to.not.equal('abc')
  })

  const authMsg = 'You have to login first'
  const authAdminMsg = `Only 'admin' is allowed to access this resource`
  const authSuperadminMsg = `Only 'admin,superadmin' is allowed to access this resource`

  const metas = [
    { auth: true },
    { auth: false },
    {},
    { auth: {} },
    { auth: { role: 'admin' } },
    { auth: { role: ['admin', 'superadmin'] } }
  ]

  const variants = ['sync', 'async']

  variants.forEach(variant => {
    it(`auth middleware ${variant}`, async () => {
      const store = loadStore({
        loadMethods: { path: join(__dirname, 'testApp', 'store') }
      })
      metas.forEach((meta, index) => {
        const methodAuth = variant === 'sync'
          ? meta.auth
          : async () => meta.auth
        store.define(`m${index + 1}`, () => null, { auth: methodAuth })
      })

      await expect(store.dispatch('m1', null, {})).to.be.rejectedWith(authMsg)
      await expect(store.dispatch('m1', null, { user: true })).to.be.not.rejected

      await expect(store.dispatch('m2', null, {})).to.be.not.rejected
      await expect(store.dispatch('m2', null, { user: true })).to.be.not.rejected

      if (variant === 'sync') {
        await expect(store.dispatch('m3', null, {})).to.be.not.rejected
        await expect(store.dispatch('m3', null, { user: true })).to.be.not.rejected
      } else {
        await expect(store.dispatch('m3', null, {})).to.be.rejected
        await expect(store.dispatch('m3', null, { user: true })).to.be.not.rejected
      }

      await expect(store.dispatch('m4', null, {})).to.be.rejectedWith(authMsg)
      await expect(store.dispatch('m4', null, { user: true })).to.be.not.rejected

      await expect(store.dispatch('m5', null, {})).to.be.rejectedWith(authMsg)
      await expect(store.dispatch('m5', null, { user: true })).to.be.rejectedWith(authAdminMsg)
      await expect(store.dispatch('m5', null, { user: { role: 'member' } })).to.be.rejectedWith(authAdminMsg)
      await expect(store.dispatch('m5', null, { user: { role: 'admin' } })).to.be.not.rejected

      await expect(store.dispatch('m6', null, {})).to.be.rejectedWith(authMsg)
      await expect(store.dispatch('m6', null, { user: true })).to.be.rejectedWith(authSuperadminMsg)
      await expect(store.dispatch('m6', null, { user: { role: 'member' } })).to.be.rejectedWith(authSuperadminMsg)
      await expect(store.dispatch('m6', null, { user: { role: 'admin' } })).to.be.not.rejected
      await expect(store.dispatch('m6', null, { user: { role: 'superadmin' } })).to.be.not.rejected
    })
  })

  it('auth middleware - auth fn with { payload, context, errors }', async () => {
    const store = loadStore({
      loadMethods: { path: join(__dirname, 'testApp', 'store') }
    })
    const spy = sinon.fake(() => false)
    store.define('m1', () => null, { auth: spy })
    const payload = {}
    const context = {}
    await store.dispatch('m1', payload, context)
    expect(spy.calledOnce).to.equal(true)
    const authCtx = spy.firstCall.args[0]
    expect(authCtx.payload).to.equal(payload)
    expect(authCtx.context).to.equal(context)
    expect(authCtx.errors).to.equal(errors)
  })

  it('auth middleware - throw error from auth', async () => {
    const store = loadStore({
      loadMethods: { path: join(__dirname, 'testApp', 'store') }
    })
    store.define('m1', () => null, { auth: () => {
      throw new Error('test')
    } })
    expect(store.dispatch('m1')).to.be.rejectedWith('test')
  })

  describe('logger', () => {
    let logLevel = null

    before(() => {
      logLevel = process.env.STORE_LOG_LEVEL
      delete process.env.STORE_LOG_LEVEL
    })

    after(() => {
      process.env.STORE_LOG_LEVEL = logLevel
    })

    it('respect customData option', async () => {
      const spy = sinon.fake(() => {
        return { a: 'b' }
      })
      const spy2 = sinon.spy()
      const store = loadStore({
        loadMethods: { path: join(__dirname, 'testApp', 'store') },
        logger: { customData: spy }
      })
      store.define('test', spy2)
      const getLines = captureLog()
      await store.dispatch('test')
      const lines = getLines()
      expect(lines.length).to.equal(2)
      expect(lines[0].a).to.equal('b')
      expect(lines[1].a).to.equal('b')
      expect(spy.calledTwice).to.equal(true)
      const cid = spy2.firstCall.args[1].cid
      expect(spy.firstCall.args[0]).to.eql({
        when: 'before',
        startTime: undefined,
        err: undefined,
        source: 'auto',
        method: 'test',
        context: null,
        cid,
        seq: 0,
        meta: undefined,
        stack: [
          {
            cid,
            seq: 0,
            method: 'test'
          }
        ],
        payload: undefined
      })
      spy.secondCall.args[0].startTime = undefined
      expect(spy.secondCall.args[0]).to.eql({
        when: 'after',
        startTime: undefined,
        err: undefined,
        source: 'auto',
        method: 'test',
        context: null,
        cid,
        seq: 0,
        meta: undefined,
        stack: [
          {
            cid,
            seq: 0,
            method: 'test'
          }
        ],
        payload: undefined
      })
    })

    it('add user to custom data', async () => {
      const store = loadStore({
        loadMethods: { path: join(__dirname, 'testApp', 'store') },
        logger: true
      })
      store.define('test', () => null)
      const getLines = captureLog()
      await store.dispatch('test', null, { user: { id: 1, role: 'admin' } })
      const lines = getLines()
      expect(lines.length).to.equal(2)
      expect(lines[0].user).to.eql({ id: 1, role: 'admin' })
      expect(lines[1].user).to.eql({ id: 1, role: 'admin' })
    })

    it('dont load logger by default', async () => {
      const store = loadStore({
        loadMethods: { path: join(__dirname, 'testApp', 'store') }
      })
      store.define('test', () => null)
      const getLines = captureLog()
      await store.dispatch('test', null, { user: { id: 1, role: 'admin' } })
      const lines = getLines()
      expect(lines.length).to.equal(0)
    })

    it('add pgErrDetails to custom data', async () => {
      const store = loadStore({
        loadMethods: { path: join(__dirname, 'testApp', 'store') },
        logger: true
      })
      store.define('test', () => {
        const err = new Error('pg_error')
        err.code = 12345
        err.detail = 'detail'
        err.constraint = 'constraint'
        err.column = 'column'
        err.table = 'table'
        err.schema = 'schema'
        throw err
      })
      const getLines = captureLog()
      try { await store.dispatch('test') } catch (err) {}
      const lines = getLines()
      expect(lines.length).to.equal(2)
      expect(lines[0].pgErrDetails).to.eql(undefined)
      expect(lines[1].pgErrDetails).to.eql({
        code: 12345,
        column: 'column',
        constraint: 'constraint',
        detail: 'detail',
        schema: 'schema',
        table: 'table'
      })
    })
  })

  it('pass true as options.logger', async () => {
    expect(() => {
      loadStore({ logger: true })
    }).to.not.throw()
  })

  it('throw error on invalid options', async () => {
    expect(() => {
      loadStore(null)
    }).to.throw('Expected `options` to be of type `object` but received type `null`')
  })

  it('throw error on invalid options.loadMethods', async () => {
    expect(() => {
      loadStore({ loadMethods: 'invalid' })
    }).to.throw('Expected `options.loadMethods` to be of type `object` but received type `string`')
  })

  it('throw error on invalid options.logger', async () => {
    expect(() => {
      loadStore({ logger: 'invalid' })
    }).to.throw('Any predicate failed with the following errors:\n- Expected argument to be of type `object` but received type `string`\n- Expected argument to be of type `boolean` but received type `string`')
  })

  it('throw error on invalid options.logger.customData', async () => {
    expect(() => {
      loadStore({ logger: { customData: 'abc' } })
    }).to.throw('Expected `options.logger.customData` to be of type `Function` but received type `string`')
  })

  it('throw error on invalid options.methodContext', async () => {
    expect(() => {
      loadStore({ methodContext: 'abc' })
    }).to.throw('Expected `options.methodContext` to be of type `object` but received type `string`')
  })
})

function captureLog () {
  const capture = new CaptureStdout()
  capture.startCapture()
  return () => {
    capture.stopCapture()
    const lines = capture.getCapturedText()
    try {
      return lines.map(line => JSON.parse(line))
    } catch (err) {
      console.error(lines.join('\n'))
    }
  }
}
