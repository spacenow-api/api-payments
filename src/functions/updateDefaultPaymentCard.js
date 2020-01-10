'use strict'

const r = require('./../helpers/response.utils')
const paymentService = require('./../services/payment.service')

module.exports.main = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false
  const { userId, cardId } = event.pathParameters
  paymentService
    .updateDefaultPaymentCard(userId, cardId)
    .then((data) => callback(null, r.success(data)))
    .catch((err) => callback(null, r.failure(err)))
}
