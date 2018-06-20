# backend-helpers

Work in progress

## Install

```sh
$ yarn add backend-helpers
```

## Usage

```js
import { loadStore, loadGraphql, createGraphqlApp } from 'backend-helpers'
```

## Docs

### loadStore([options]) => BackendStore

| Argument              | Type     | Description
|-----------------------|----------|------------
| [options.loadMethods] | object   | Options passed to [backend-store](https://github.com/alekbarszczewski/backend-store) loadMethods plugin ( [available options](https://alekbarszczewski.github.io/backend-store/#/load-methods?id=options))
| [options.logger]      | object   | Options passed to [backend-store](https://github.com/alekbarszczewski/backend-store) logger plugin ( [available options](https://alekbarszczewski.github.io/backend-store/#/logger?id=options))
|
| [options.methodContext] | object | All props of passed object will be assigned to every [backend-store](https://github.com/alekbarszczewski/backend-store) [MethodContext](https://alekbarszczewski.github.io/backend-store/#/store?id=method-context)
|

This function is a helper that loads/initializes [backend-store](https://github.com/alekbarszczewski/backend-store).

* If [options.loadMethods] is passed it automatically uses [loadMethods](https://alekbarszczewski.github.io/backend-store/#/load-store) plugin to load store from directory

* It automatically uses [logger](https://alekbarszczewski.github.io/backend-store/#/logger) plugin additionally passing [options.logger] to it.
  * Additionally it adds `user: context.user` to each log line
  * Additionally it adds `pgErrDetails: { code, detail, constraint, column, table, schema }` to log line if Postgres error occured

* If [options.methodContext] is passed then it will be assigned to each [MethodContext](https://alekbarszczewski.github.io/backend-store/#/store?id=method-context). It's useful to pass some helpers to backend-store methods instead of importing them.

* It adds auth middleware to the store (described below)

### loadGraphql(path, [options]) => GraphqlSchema

### createGraphqlApp(graphqlSchema, [options]) => { app, graphqlHTTP }

# TODO

- docs
- loadStore - logger options - test
- validate args
- example app
