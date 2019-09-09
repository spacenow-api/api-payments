'use strict'

const Stripe = require('stripe')

const { getInstance: redisInstance } = require('./../helpers/redis.server')

const {
  UserProfile
} = require('./../models')

const redis = redisInstance()
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

async function getPaymentAccountByUserId(userId) {
  if (!userId) throw new Error(`User ID not found.`)
  const cacheKey = `__stripe__account__${userId}`;
  const cacheContent = await redis.get(cacheKey)
  if (cacheContent) {
    return { status: 'OK', account: JSON.parse(cacheContent) }
  } else {
    try {
      const userProfileObj = await UserProfile.findOne({ where: { userId } });
      if (!userProfileObj) throw new Error(`User ${userId} does not have a valid Profile.`);
      if (userProfileObj.accountId) {
        const account = await stripeInstance.accounts.retrieve(userProfileObj.accountId);
        if (!account) throw new Error(`Stripe Account ${userProfileObj.accountId} not found.`);
        await redis.set(cacheKey, JSON.stringify(account))
        return { status: 'OK', account }
      } else {
        return { status: 'EMPTY', message: `User ${userId} does not have Stripe Account ID.` }
      }
    } catch (err) {
      throw new Error(err)
    }
  }
}

async function createPaymentAccountByUserId(userId, accountDetails) {

}

async function deletePaymentAccountByUserId(userId) {

}

module.exports = { getPaymentAccountByUserId, createPaymentAccountByUserId, deletePaymentAccountByUserId }
