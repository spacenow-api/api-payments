'use strict'

const { DataTypes } = require('sequelize')

const { getInstance } = require('./../helpers/mysql.server')

const sequelize = getInstance()

const User = require('./../models/user.model')(sequelize, DataTypes)
const UserProfile = require('./../models/userProfile.model')(sequelize, DataTypes)

module.exports = {
  User,
  UserProfile
}
