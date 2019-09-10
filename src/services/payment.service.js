'use strict'

const Stripe = require('stripe')

const { getInstance: redisInstance } = require('./../helpers/redis.server')

const { UserProfile } = require('./../models')

const redis = redisInstance()
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

const _rKey = (userId) => `__stripe__account__${userId}`

async function getUserProfileByUserId(userId) {
  const userProfileObj = await UserProfile.findOne({ where: { userId } });
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
    const { customerId } = await getUserProfileByUserId(userId)
    if (customerId)
      return await stripeInstance.customers.retrieve(customerId);
    throw new Error(`User ${userId} doesn't have a valid customer ID.`)
  } catch (err) {
    throw err
  }
}

async function createPaymentCardByUserId(userId, { cardName, cardNumber, expMonth, expYear, cvc }) {

}

async function deletePaymentCardByUserId(userId, { cardId }) {

}

async function doPayment() {

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
