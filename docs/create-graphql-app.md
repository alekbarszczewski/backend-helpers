# createGraphqlApp

#### createGraphqlApp(graphqlSchema, [options]) => { app, graphqlHTTP }

Creates new express app that executes graphql schema (through [express-graphql](https://github.com/graphql/express-graphql))
on `POST /` requests.
It also adds [express-jwt](https://github.com/auth0/express-jwt) and [cors](https://github.com/expressjs/cors) middlewares which
are configurable through [options.jwt] and [options.cors] respectively.

## Usage

```js
import express from 'express'
import { createGraphqlApp, loadGraphql } from 'backend-helpers'
import { join } from 'path'

const app = express()

const graphqlSchema = loadGraphql(join(__dirname, 'graphql-modules'))

const { app: graphqlApp } = createGraphqlApp(graphqlSchema, {
  jwt: { secret: '******' },
  cors: { /* cors options */ }
})

app.mount('/graphql', graphqlApp)

app.listen(5000)
```

## Options

| Argument          | Type     | Description
|-------------------|----------|------------
| graphqlSchema     | string   | Graphql executable schema
| [options.jwt]     | object   | Options passed to [express-jwt](https://github.com/auth0/express-jwt) middleware
| [options.cors]    | object or true   | Options passed to [cors](https://github.com/expressjs/cors) middleware

**return**

It returns object with following fields:

```js
{ app, graphqlHTTP }
```

* **app** - express app that executes graphql schema on `POST /` requests
* **graphqlHTTP** - [express-graphql](https://github.com/graphql/express-graphql) middleware instance (usually you don't need this one because it's already used on app)
