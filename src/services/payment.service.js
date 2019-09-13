'use strict'

const Stripe = require('stripe')

const { getInstance: redisInstance } = require('./../helpers/redis.server')
const bookingService = require('./booking.service')
const emailService = require('./email.service')

const {
  User,
  UserProfile,
  Listing,
  Location
} = require('./../models')

const redis = redisInstance()
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

const _rKey = (userId) => `__stripe__account__${userId}`

async function getUserProfileByUserId(userId) {
  const userProfileObj = await UserProfile.findOne({ where: { userId }, raw: true });
  if (!userProfileObj)
    throw new Error(`User ${userId} does not have a valid Profile.`);
  return userProfileObj
}

async function getPaymentAccountByUserId(userId) {
  if (!userId) throw new Error(`User ID not found.`)
  const cacheKey = _rKey(userId);
  const cacheContent = await redis.get(cacheKey)
  if (cacheContent) {
    return JSON.parse(cacheContent)
  } else {
    try {
      const userProfileObj = await getUserProfileByUserId(userId)
      if (userProfileObj.accountId) {
        const account = await stripeInstance.accounts.retrieve(userProfileObj.accountId);
        if (!account) throw new Error(`Stripe Account ${userProfileObj.accountId} not found.`);
        await redis.set(cacheKey, JSON.stringify(account))
        return account
      } else {
        throw new Error(`User ${userId} does not have Stripe Account ID.`)
      }
    } catch (err) {
      throw err
    }
  }
}

async function createPaymentAccountByUserId(userId, accountDetails) {
  if (!userId) throw new Error(`User ID not found.`)
  try {
    const userProfileObj = await getUserProfileByUserId(userId)
    if (userProfileObj.accountId) throw new Error(`User ${userId} already has a valid Stripe Account ID: ${userProfileObj.accountId}`);

    const accountCreated = await stripeInstance.accounts.create(accountDetails);
    if (!accountCreated) throw new Error(`User ${userId} does not have a valid Profile.`);
    await UserProfile.update({ accountId: accountCreated.id }, { where: { profileId: userProfileObj.profileId } });

    // Save cache...
    const cacheKey = _rKey(userId);
    await redis.set(cacheKey, JSON.stringify(accountCreated))
    return accountCreated
  } catch (err) {
    throw err
  }
}

async function deletePaymentAccountByUserId(userId) {
  if (!userId) throw new Error(`User ID not found.`)
  try {
    const userProfileObj = await getUserProfileByUserId(userId)
    let confirmation = {
      id: userProfileObj.accountId,
      deleted: false
    };
    if (userProfileObj.accountId) {
      confirmation = await stripeInstance.accounts.del(userProfileObj.accountId);
      await UserProfile.update({ accountId: null }, { where: { profileId: userProfileObj.profileId } });
      await redis.del(_rKey(userId));
    }
    return confirmation
  } catch (err) {
    throw err
  }
}

async function getPaymentCardByUserId(userId) {
  try {
    const userProfileObj = await getUserProfileByUserId(userId)
    if (userProfileObj.customerId)
      return stripeInstance.customers.retrieve(userProfileObj.customerId);
    const userObj = await User.findOne({ where: { id: userId } })
    const customerData = await stripeInstance.customers.create({ email: userObj.email })
    await UserProfile.update({ customerId: customerData.id }, { where: { userId } })
    return stripeInstance.customers.retrieve(customerData.id);
  } catch (err) {
    throw err
  }
}

async function createPaymentCardByUserId(userId, { cardName, cardNumber, expMonth, expYear, cvc }) {
  if (!cardName || !cardNumber || !expMonth || !expYear || !cvc)
    throw new Error('Incorrect card details or missing.')
  try {
    const tokenCard = await stripeInstance.tokens.create({
      card: {
        name: cardName,
        number: cardNumber,
        exp_month: expMonth,
        exp_year: expYear,
        cvc: cvc
      }
    })
    const userProfileObj = await getUserProfileByUserId(userId)
    await stripeInstance.customers.createSource(userProfileObj.customerId, { source: tokenCard.id });
    return getPaymentCardByUserId(userId)
  } catch (err) {
    throw err
  }
}

async function deletePaymentCardByUserId(userId, cardId) {
  try {
    const userProfileObj = await getUserProfileByUserId(userId)
    await stripeInstance.customers.deleteSource(userProfileObj.customerId, cardId);
    return getPaymentCardByUserId(userId)
  } catch (err) {
    throw err
  }
}

async function doPayment(userId, { cardId, bookingId }) {
  if (!cardId || !bookingId)
    throw new Error('Payment details are incorrect or missing.')
  try {
    // Getting necessary data...
    const userGuestObj = await User.findOne({ where: { id: userId }, raw: true })
    const userGuestProfileObj = await getUserProfileByUserId(userId)
    const { data: bookingObj } = await bookingService.getBookingById(bookingId)
    const userHostObj = await User.findOne({ where: { id: bookingObj.hostId }, raw: true })
    const userHostProfileObj = await getUserProfileByUserId(bookingObj.hostId)
    const listingObj = await Listing.findOne({ where: { id: bookingObj.listingId }, raw: true })
    const locationObj = await Location.findOne({ where: { id: listingObj.locationId }, raw: true })
    // Doing payment by Stripe
    const stripeCharge = await stripeInstance.charges.create({
      amount: Math.round(bookingObj.totalPrice * 100),
      currency: bookingObj.currency,
      customer: userGuestProfileObj.customerId,
      source: cardId,
      description: `Reservation: ${bookingId}`,
      metadata: {
        reservationId: bookingId,
        listId: listingObj.id,
        title: listingObj.title,
        guestEmail: userGuestObj.email,
        amount: bookingObj.totalPrice,
        customerId: userGuestProfileObj.customerId,
        hostName: userHostProfileObj.firstName,
        listingAddress: `${locationObj.address}, ${locationObj.city}  ${locationObj.state} ${locationObj.zipcode}`,
      }
    })
    // Updating booking and transaction...
    const newBookingState = await bookingService.onUpdateStateById(bookingId, bookingObj.bookingType)
    await bookingService.onUpdateBookingChargeAndCard(bookingId, cardId, stripeCharge.id)
    await bookingService.onUpdateTransaction(
      bookingId,
      stripeCharge.id,
      userGuestObj.email,
      userGuestObj.id,
      userHostObj.email,
      userHostObj.id,
      Math.round(bookingObj.totalPrice * 100) / 100,
      bookingObj.currency
    )
    // Send Emails...
    // await emailService.sendBookingConfirmation(bookingObj, listingObj, locationObj, { ...userHostObj, ...userHostProfileObj }, { ...userGuestObj, ...userGuestProfileObj })
    return { status: 'OK', bookingId, bookingState: newBookingState }
  } catch (err) {
    throw err
  }
}

module.exports = {
  getPaymentAccountByUserId,
  createPaymentAccountByUserId,
  deletePaymentAccountByUserId,
  getPaymentCardByUserId,
  createPaymentCardByUserId,
  deletePaymentCardByUserId,
  doPayment
}
