'use strict'

const axios = require('axios')
const moment = require('moment')

const {
  ListingPhotos,
  ListSettings,
  ListSettingsParent
} = require('./../models')

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

function getPeriod(reservations, periodType) {
  let count = 1
  if (reservations && reservations.length > 0)
    count = reservations.length
  let period = ''
  switch (periodType) {
    case 'weekly': {
      period = count > 1 ? 'Weeks' : 'Week'
    }
    case 'monthly': {
      period = count > 1 ? 'Months' : 'Month'
    }
    default: {
      period = count > 1 ? 'Days' : 'Day'
    }
  }
  return `${count} ${period}`
}

async function getCoverPhotoPath(listingId) {
  const listingPhotosArray = await ListingPhotos.findAll({ where: { listingId } })
  if (listingPhotosArray && listingPhotosArray.length > 0) {
    const coverPhoto = listingPhotosArray.filter(o => o.isCover)
    if (!coverPhoto)
      return listingPhotosArray[0].name
    return coverPhoto[0].name
  }
  return ''
}

async function getCategoryAndSubNames(listSettingsParentId) {
  const parentObj = await ListSettingsParent.findOne({
    attributes: ['listSettingsParentId', 'listSettingsChildId'],
    where: { id: listSettingsParentId }
  })
  const categoryObj = await ListSettings.findOne({
    attributes: ['id', 'itemName'],
    where: { id: parentObj.listSettingsParentId }
  })
  const subCategoryObj = await ListSettings.findOne({
    attributes: ['id', 'itemName'],
    where: { id: parentObj.listSettingsChildId }
  })
  return { category: categoryObj.itemName, subCaregory: subCategoryObj.itemName }
}

module.exports = {

  sendBookingConfirmation: async (bookingObj, listingObj, locationObj, hostObj, guestObj) => {
    const checkIn = moment(bookingObj.checkIn).tz('Australia/Sydney').format('ddd, Do MMM, YYYY').toString()
    const checkOut = moment(bookingObj.checkOut).tz('Australia/Sydney').format('ddd, Do MMM, YYYY').toString()
    const checkInShort = moment(bookingObj.checkIn).tz('Australia/Sydney').format('Do MMM').toString()
    const categoryAndSubObj = await getCategoryAndSubNames(listingObj.listSettingsParentId)
    const coverPhoto = await getCoverPhotoPath(listingObj.id)
    if (bookingObj.bookingType === 'instant') {
      // To host...
      const hostMetadata = {
        user: hostObj.firstName,
        hostName: hostObj.firstName,
        guestName: guestObj.firstName,
        checkinDateShort: checkInShort,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        listTitle: listingObj.title,
        listAddress: `${locationObj.address1}, ${locationObj.city}`,
        totalPeriod: `${getPeriod(bookingObj.reservations, bookingObj.priceType)}`,
        basePrice: bookingObj.basePrice,
        priceType: bookingObj.priceType,
        coverPhoto: coverPhoto,
        categoryName: categoryAndSubObj.category,
        subCategoryName: categoryAndSubObj.subCaregory
      }
      // send('booking-instant-email-host', hostObj.email, hostMetadata)
      // To guest...
      const guestMetada = {
        user: guestObj.firstName,
        hostName: hostObj.firstName,
        guestName: guestObj.firstName,
        city: locationObj.city,
        checkinDateShort: checkInShort
      }
      // send('booking-instant-email-guest', guestObj.email, guestMetada)
    } else {
      // Request booking to host...
      const hostMetadata = {
        user: hostObj.firstName,
        guestName: guestObj.firstName,
        listTitle: listingObj.title,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        basePrice: bookingObj.basePrice,
        total: bookingObj.totalPrice
      }
      // send('booking-request-email-host', hostObj.email, hostMetadata)
      // To guest...
      const guestMetadata = {
        user: guestObj.firstName,
        confirmationCode: bookingObj.confirmationCode,
        checkInDate: checkIn,
        hostName: hostObj.firstName,
        listTitle: listingObj.title
      }
      // send('booking-request-email-guest', guestObj.email, guestMetadata)
    }
  }
}
