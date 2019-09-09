'use strict'

const Stripe = require('stripe')

const { getInstance: redisInstance } = require('./../helpers/redis.server')

const {
  UserProfile
} = require('./../models')

const redis = redisInstance()
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

const _rKey = (userId) => `__stripe__account__${userId}`

async function getPaymentAccountByUserId(userId) {
  if (!userId) throw new Error(`User ID not found.`)
  const cacheKey = _rKey(userId);
  const cacheContent = await redis.get(cacheKey)
  if (cacheContent) {
    return { status: 'OK', result: JSON.parse(cacheContent) }
  } else {
    try {
      const userProfileObj = await UserProfile.findOne({ where: { userId } });
      if (!userProfileObj) throw new Error(`User ${userId} does not have a valid Profile.`);
      if (userProfileObj.accountId) {
        const account = await stripeInstance.accounts.retrieve(userProfileObj.accountId);
        if (!account) throw new Error(`Stripe Account ${userProfileObj.accountId} not found.`);
        await redis.set(cacheKey, JSON.stringify(account))
        return { status: 'OK', result: account }
      } else {
        return { status: 'EMPTY', result: `User ${userId} does not have Stripe Account ID.` }
      }
    } catch (err) {
      throw err
    }
  }
}

async function createPaymentAccountByUserId(userId, accountDetails) {
  if (!userId) throw new Error(`User ID not found.`)
  try {
    const userProfileObj = await UserProfile.findOne({ where: { userId } });
    if (!userProfileObj) throw new Error(`User ${userId} does not have a valid Profile.`);
    if (userProfileObj.accountId) throw new Error(`User ${userId} already has a valid Stripe Account ID: ${userProfileObj.accountId}`);

    const accountCreated = await stripeInstance.accounts.create(accountDetails);
    if (!accountCreated) throw new Error(`User ${userId} does not have a valid Profile.`);
    await UserProfile.update({ accountId: accountCreated.id }, { where: { profileId: userProfileObj.profileId } });

    // Save cache...
    const cacheKey = _rKey(userId);
    await redis.set(cacheKey, JSON.stringify(accountCreated))
    return { status: 'OK', result: accountCreated }
  } catch (err) {
    throw err
  }
}

async function deletePaymentAccountByUserId(userId) {
  if (!userId) throw new Error(`User ID not found.`)
  try {
    const userProfileObj = await UserProfile.findOne({ where: { userId } });
    if (!userProfileObj) throw new Error(`User ${userId} does not have a valid Profile.`);
    let confirmation = {
      id: userProfileObj.accountId,
      deleted: false
    };
    if (userProfileObj.accountId) {
      confirmation = await stripeInstance.accounts.del(userProfileObj.accountId);
      await UserProfile.update({ accountId: null }, { where: { profileId: userProfileObj.profileId } });
      await redis.del(_rKey(userId));
    }
    return { status: 'OK', result: confirmation }
  } catch (err) {
    throw err
  }
}

module.exports = { getPaymentAccountByUserId, createPaymentAccountByUserId, deletePaymentAccountByUserId }
