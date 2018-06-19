const { Store } = require('backend-store')
const loadMethods = require('backend-store/plugins/loadMethods')
const logger = require('backend-store/plugins/logger')
const defaults = require('lodash.defaults')

module.exports = function loadStore (path, options = {}) {
  const store = new Store()

  store.plugin(loadMethods, { path })

  const loggerOptions = options.logger || {}

  store.plugin(logger, {
    ...loggerOptions,
    customData (logContext) {
      const userCustomData = loggerOptions.customData ? loggerOptions.customData(logContext) : null
      const { context, err } = logContext
      const customData = {
        user: context && context.user ? context.user : null,
        ...userCustomData
      }
      if (err) {
        const pgError = err.code ? err : (err.err && err.err.code ? err.err : null)
        if (pgError) {
          const pgErrorFields = ['code', 'detail', 'constraint', 'column', 'table', 'schema']
          customData.pgErrDetails = {}
          pgErrorFields.forEach(key => {
            customData.pgErrDetails[key] = pgError[key]
          })
        }
      }
      return customData
    }
  })

  if (options.methodContext) {
    store.use(function methodContext (payload, { methodContext }, next) {
      defaults(methodContext, options.methodContext)
      return next(payload)
    })
  }

  store.use(authMiddleware)

  return store
}

const authMiddleware = async function auth (payload, { meta, errors, context }, next) {
  let auth = meta && meta.auth

  if (auth && typeof auth === 'function') {
    auth = await meta.auth({ payload, context, errors })
    if (!auth && auth !== false) {
      auth = true
    }
  }

  if (auth) {
    if (!context || !context.user) {
      throw new errors.AuthenticationError({ message: 'You have to login first' })
    } else if (auth.role) {
      const checkRole = Array.isArray(auth.role) ? auth.role : [auth.role]
      if (!checkRole.includes(context.user.role)) {
        throw new errors.AuthorizationError({ message: `Only '${auth.role}' is allowed to access this resource` })
      }
    }
  }

  return next(payload)
}
