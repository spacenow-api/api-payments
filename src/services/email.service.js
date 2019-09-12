'use strict'

const axios = require('axios')
const moment = require('moment')

function send(templateName, destination, templateData) {
  axios.post(`${process.env.EMAILS_API}/email/send`, {
    template: templateName,
    data: JSON.stringify({ email: destination, ...templateData })
  }).then(({ data }) => {
    console.info(`Email '${templateName}' send with success to '${destination}'.\nMessage ID: ${data.MessageId}`)
  }).catch((err) => {
    console.error(`Problems to send email '${templateName}' to '${destination}'.\nError: `, err)
  })
}

module.exports = {

  sendBookingConfirmation: (bookingObj, listingObj, locationObj, hostObj, guestObj) => {
    if (bookingObj.bookingType === 'instant') {
      const checkInShort = moment(bookingObj.checkIn).tz('Australia/Sydney').format('Do MMM').toString()
      // To host...
      const hostMetadata = {
        hostName: hostObj.firstName,
        guestName: guestObj.firstName,
        checkinDateShort: checkInShort
      }
      send('booking-instant-email-host', hostObj.email, hostMetadata)
      // To guest...
      const guestMetada = {
        hostName: hostObj.firstName,
        guestName: guestObj.firstName,
        city: locationObj.city,
        checkinDateShort: checkInShort
      }
      send('booking-instant-email-guest', guestObj.email, guestMetada)
    } else {
      // Request booking...
      const checkIn = moment(bookingObj.checkIn).tz('Australia/Sydney').format('ddd, Do MMM, YYYY').toString()
      const checkOut = moment(bookingObj.checkOut).tz('Australia/Sydney').format('ddd, Do MMM, YYYY').toString()
      // To host...
      const hostMetadata = {
        user: hostObj.firstName,
        guestName: guestObj.firstName,
        listTitle: listingObj.title,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        basePrice: bookingObj.basePrice,
        total: bookingObj.totalPrice
      }
      send('booking-request-email-host', hostObj.email, hostMetadata)
      // To guest...
      const guestMetadata = {
        user: guestObj.firstName,
        confirmationCode: bookingObj.confirmationCode,
        checkInDate: checkIn,
        hostName: hostObj.firstName,
        listTitle: listingObj.title
      }
      send('booking-request-email-guest', guestObj.email, guestMetadata)
    }
  }
}
