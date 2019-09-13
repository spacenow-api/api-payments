'use strict'

const axios = require('axios')

const { Transaction } = require('./../models');

module.exports = {

  getBookingById: async (id) => {
    return axios.get(`${process.env.API_BOOKING}/${id}`)
  },

  onUpdateStateById: async (bookingId, bookingType) => {
    let bookingData
    if (!bookingType)
      throw new Error('Booking Type incorrect or missing.')
    if (bookingType === 'request') {
      bookingData = await axios.put(`${process.env.API_BOOKING}/request/${bookingId}`)
    } else {
      bookingData = await axios.put(`${process.env.API_BOOKING}/approve/${bookingId}`)
    }
    return bookingData.data.data.bookingState
  },

  onUpdateBookingChargeAndCard: async (bookingId, cardId, chargeId) => {
    return axios.put(`${process.env.API_BOOKING}/${bookingId}`, { sourceId: cardId, chargeId: chargeId })
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
