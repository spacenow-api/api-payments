'use strict'

const Redis = require('ioredis')

let redis = null

function initInstance() {
  if (!redis) {
    console.info('Initializing Redis connection.')
    redis = new Redis(process.env.REDIS_HOST)
  }
}

function getInstance() {
  if (!redis) {
    initInstance()
  }
  return redis
}

module.exports = { initInstance, getInstance }
