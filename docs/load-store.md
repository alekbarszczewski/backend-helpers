# loadStore

#### loadStore([options]) => BackendStore

## Usage

```js
import { loadStore } from 'backend-helpers'
import { join } from 'path'
import { knex } from './db'

const store = loadStore({
  loadMethods: { path: join(__dirname, 'my-store') },
  logger: {
    customData () {
      return { myCustomLogField: 123 }
    }
  },
  methodContext: {
    knex
  }
})
```

## Options

| Argument              | Type     | Description
|-----------------------|----------|------------
| [options.loadMethods] | object   | Options passed to [backend-store](https://github.com/alekbarszczewski/backend-store) loadMethods plugin ( [available options](https://alekbarszczewski.github.io/backend-store/#/load-methods?id=options))
| [options.logger]      | object or true   | Options passed to [backend-store](https://github.com/alekbarszczewski/backend-store) logger plugin ( [available options](https://alekbarszczewski.github.io/backend-store/#/logger?id=options))
| [options.methodContext] | object | All props of passed object will be assigned to every [backend-store](https://github.com/alekbarszczewski/backend-store) [MethodContext](https://alekbarszczewski.github.io/backend-store/#/store?id=method-context)

**options.loadMethods**

If this options is set then its value is passed to [backend-store](https://github.com/alekbarszczewski/backend-store) loadMethods plugin ([available options](https://alekbarszczewski.github.io/backend-store/#/load-methods?id=options)).

**options.logger**

If this option is set its value is passed to [backend-store](https://github.com/alekbarszczewski/backend-store) logger plugin ( [available options](https://alekbarszczewski.github.io/backend-store/#/logger?id=options)).

!> loadStore also adds custom data field to each log line: `user: context.user`.

!> loadStore also adds custom data field to each log line when Postgres error is logged: `pgErrDetails: { code, detail, constraint, column, table, schema }`.

**options.methodContext**

If this option is passed, then all props of it will be assigned to [backend-store](https://github.com/alekbarszczewski/backend-store) [MethodContext](https://alekbarszczewski.github.io/backend-store/#/store?id=method-context) in each method.
It's useful for passing some global context to each method (like database interface for example) instead of importing it from code.

## Auth middleware

loadStore adds auth middleware to store.
This middleware allows to define authentication/authorization rules in each method meta data.
You can define authentication/authorization by setting `meta.auth` field for method in the store.

**meta.auth - boolean**

```js
// no authentication
store.define('test', () => null, {
  // auth
})

// will throw error if context.user evaluates to false
store.define('test', () => null, {
  auth: true
})
```

**meta.auth - object**

```js
// will throw error if context.user evaluates to false (same as auth: true)
store.define('test', () => null, {
  auth: {}
})

// will throw error if context.user.role is not admin
store.define('test', () => null, {
  auth: {
    role: 'admin'
  }
})

// will throw error if context.user.role is not admin or editor
store.define('test', () => null, {
  auth: {
    role: ['admin', 'editor']
  }
})
```

**meta.auth - function**

If `meta.auth` is a functions (it may also return Promise) then it takes one argument which is an object with following fields:

* **payload** - payload passed to method
* **context** - context passed to method
* **errors** - [backend-store](https://github.com/alekbarszczewski/backend-store) [errors](https://alekbarszczewski.github.io/backend-store/#/errors?id=errors)

It may return same values as **meta.auth - boolean**, **meta.auth - object** or it may just throw error.

```js
// will throw error if context.user.permissions.test evaluates to false
store.define('test', () => null, {
  async auth ({ payload, context, errors }) {
    if (!context || !context.user || !context.user.permissinons || !context.user.permissions.test) {
      throw new errors.AuthorizationError(`You don't have permissions to test`)
    }
  }
})

// will throw error if context.user evaluates to false
store.define('test', () => null, {
  async auth ({ payload, context, errors }) {
    // nothing is returned here
  }
})

// will pass-through
store.define('test', () => null, {
  async auth ({ payload, context, errors }) {
    // returning false explicitly will pass through event if context.user evaluates to false
    return false
  }
})

// will pass-through
store.define('test', () => null, {
  async auth ({ payload, context, errors }) {
    // returning false explicitly will pass through event if context.user evaluates to false
    return false
  }
})

// will throw error depending on method payload and user role
store.define('test', () => null, {
  async auth ({ payload, context, errors }) {
    if (payload.published != null) {
      // only admin can update "published" field
      return { role: 'admin' }
    } else {
      // the rest of fields may be updated by editor
      return { role: 'editor' }
    }
  }
})
```

## Example

**my-store/test.js**

```js
export default (({ define }) => {
  define('test', (payload, methodContext) => {
    const { knex, context } = methodContext
    const { user } = context
    // ...
    return 123
  }, {
    auth: { role: 'admin' }
  })
})
```

**store.js**

```js
import { loadStore } from 'backend-helpers'
import { join } from 'path'
import { knex } from './db'

const store = loadStore({
  loadMethods: { path: join(__dirname, 'my-store') },
  logger: {
    customData ({ context }) {
      return { ipAddress: context.ip }
    }
  },
  methodContext: {
    knex
  }
})

export default store
```

**test.js**

```js
import store from './store'

store.dispatch('test', null, {
  user: { id: 1, role: 'admin' },
  ip: '192.168.0.1'
})
```
