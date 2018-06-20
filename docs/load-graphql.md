# loadGraphql

#### loadGraphql(path) => GraphqlSchema

## Usage

```js
import { loadGraphql } from 'backend-helpers'
import { join } from 'path'

const graphqlSchema = loadGraphql(join(__dirname, 'graphql-modules'))
```

## Options

| Argument | Type     | Description
|----------|----------|------------
| path     | string   | Path to directory from which graphql will be loaded using [graphql-schema-modules](https://github.com/alekbarszczewski/graphql-schema-modules)

!> **loadGraphql** automatically wraps value returned from resolver and returns it as `{ result: <result_from_resolver> }`.

!> **loadGraphql** automatically wraps error from resolver and returns it as `{ error: Error }`.

**loadGraphql** will add following graphql definitions (with proper resolvers) to schema:

```graphql
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
```
