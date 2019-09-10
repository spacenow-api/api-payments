'use strict'

const axios = require('axios')

const { Transaction } = require('./../models');

module.exports = {

  getBookingById: async (id) => {
    return axios.get(`${process.env.API_BOOKING}/bookings/${id}`)
  },

  onUpdateStateById: async (bookingId, bookingType) => {
    if (!bookingType)
      throw new Error('Booking Type incorrect or missing.')
    if (bookingType === 'request') {
      return axios.put(`${process.env.API_BOOKING}/bookings/request/${bookingId}`)
    } else {
      return axios.put(`${process.env.API_BOOKING}/bookings/approve/${bookingId}`)
    }
  },

  onUpdateBookingChargeAndCard: async (bookingId, cardId, chargeId) => {
    return axios.put(`${process.env.API_BOOKING}/bookings/${bookingId}`, { sourceId: cardId, chargeId: chargeId })
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
