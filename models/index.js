const sequelize = require('../config/database');
const Namespace = require('./Namespace');
const Table = require('./Table');
const View = require('./View');

module.exports = {
  sequelize,
  Namespace,
  Table,
  View
};