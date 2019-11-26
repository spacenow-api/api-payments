'use strict'

const axios = require('axios')

const { Transaction } = require('./../models');

module.exports = {

  getBookingById: async (id) => {
    return axios.get(`${process.env.API_BOOKING}/${id}`)
  },

  onUpdateBookingPayment: async (bookingId, cardId, chargeId) => {
    return axios.post(`${process.env.API_BOOKING}/paymentConfirmation`, { bookingId: bookingId, sourceId: cardId, chargeId: chargeId })
  },

  onUpdateTransaction: async (bookingId, chargeId, guestEmail, guestId, hostEmail, hostId, amount, currency) => {
    return Transaction.findOrCreate({
      where: {
        bookingId: bookingId,
        transactionId: chargeId,
      },
      defaults: {
        bookingId: bookingId,
        payerEmail: guestEmail,
        payerId: guestId,
        receiverEmail: hostEmail,
        receiverId: hostId,
        transactionId: chargeId,
        total: amount,
        currency: currency,
        paymentType: 'booking',
      },
    });
  }
}
