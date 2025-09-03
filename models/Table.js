const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Namespace = require('./Namespace');

const Table = sequelize.define('Table', {
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
  metadata: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  formatVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  tableUuid: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4
  },
  lastColumnId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  schemas: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  currentSchemaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  partitionSpecs: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  defaultSpecId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastPartitionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 999
  },
  sortOrders: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  defaultSortOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  snapshots: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  currentSnapshotId: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  lastSequenceNumber: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  properties: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  }
});

Table.belongsTo(Namespace, {
  foreignKey: 'namespaceId',
  allowNull: false
});

Namespace.hasMany(Table, {
  foreignKey: 'namespaceId'
});

module.exports = Table;