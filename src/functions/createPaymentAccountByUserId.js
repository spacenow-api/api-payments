'use strict'

const r = require('./../helpers/response.utils')
const paymentService = require('./../services/payment.service')

module.exports.main = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const tos_acceptance = {
    "date": Math.floor(Date.now() / 1000),
    "ip": event.requestContext.identity.sourceIp
  }

  paymentService
    .createPaymentAccountByUserId(event.pathParameters.userId, { ...JSON.parse(event.body), tos_acceptance })
    .then((data) => callback(null, r.success(data)))
    .catch((err) => callback(null, r.failure(err)))
}
