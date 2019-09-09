'use strict'

const { DataTypes } = require('sequelize')

const { getInstance } = require('./../helpers/mysql.server')

const sequelize = getInstance()

const UserProfile = require('./../models/userProfile.model')(sequelize, DataTypes)

module.exports = {
  UserProfile
}
