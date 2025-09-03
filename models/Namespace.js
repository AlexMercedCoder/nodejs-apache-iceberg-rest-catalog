const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Namespace = sequelize.define('Namespace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  levels: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  properties: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  }
});

module.exports = Namespace;