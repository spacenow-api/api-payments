'use strict'

const { DataTypes } = require('sequelize')

const { getInstance } = require('./../helpers/mysql.server')

const sequelize = getInstance()

const User = require('./../models/user.model')(sequelize, DataTypes)
const UserProfile = require('./../models/userProfile.model')(sequelize, DataTypes)
const Listing = require('./../models/listing.model')(sequelize, DataTypes)
const ListingData = require('./../models/listingData.model')(sequelize, DataTypes)
const Location = require('./../models/location.model')(sequelize, DataTypes)
const Transaction = require('./../models/transaction.model')(sequelize, DataTypes)

module.exports = {
  User,
  UserProfile,
  Listing,
  ListingData,
  Location,
  Transaction
}
