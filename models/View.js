const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Namespace = require('./Namespace');

const View = sequelize.define('View', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  viewUuid: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4
  },
  formatVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  currentVersionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  versions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  versionLog: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  schemas: {
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

View.belongsTo(Namespace, {
  foreignKey: 'namespaceId',
  allowNull: false
});

Namespace.hasMany(View, {
  foreignKey: 'namespaceId'
});

module.exports = View;