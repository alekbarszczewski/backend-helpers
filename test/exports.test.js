/* eslint-env mocha */

const chai = require('chai')
const { loadStore, loadGraphql, createGraphqlApp, __esModule: __esModule1 } = require('./../index')
const loadStore2 = require('./../src/loadStore')
const loadGraphql2 = require('./../src/loadGraphql')
const createGraphqlApp2 = require('./../src/createGraphqlApp')

const expect = chai.expect

describe('exports', () => {
  it('export functions', () => {
    expect(loadStore).to.equal(loadStore2)
    expect(loadGraphql).to.equal(loadGraphql2)
    expect(createGraphqlApp).to.equal(createGraphqlApp2)
    expect(__esModule1).to.equal(true)
  })
})
