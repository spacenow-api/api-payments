'use strict'

const r = require('./../helpers/response.utils')
const paymentService = require('./../services/payment.service')

module.exports.main = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false
  paymentService
    .deletePaymentAccountByUserId(event.pathParameters.userId)
    .then((data) => callback(null, r.success(data)))
    .catch((err) => callback(null, r.failure(err)))
}
