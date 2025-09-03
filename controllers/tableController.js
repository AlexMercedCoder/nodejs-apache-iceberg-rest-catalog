const { Table, Namespace } = require('../models');
const { v4: uuidv4 } = require('uuid');
const s3Service = require('../config/s3');

const parseNamespace = (namespaceStr) => {
  return namespaceStr.split('%1F');
};

const formatNamespace = (levels) => {
  return levels.join('%1F');
};

const listTables = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 100;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const tables = await Table.findAll({
      where: { namespaceId: namespace.id },
      limit: pageSize + 1,
      order: [['name', 'ASC']]
    });
    
    const hasMore = tables.length > pageSize;
    const items = hasMore ? tables.slice(0, -1) : tables;
    
    const response = {
      identifiers: items.map(table => ({
        namespace: namespaceLevels,
        name: table.name
      }))
    };
    
    if (hasMore && items.length > 0) {
      response['next-page-token'] = items[items.length - 1].id;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in listTables:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const createTable = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const { name, schema, location, properties = {} } = req.body;
    
    if (!name || !schema) {
      return res.status(400).json({
        message: 'Table name and schema are required',
        type: 'BadRequestException',
        code: 400
      });
    }
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const existingTable = await Table.findOne({ 
      where: { name, namespaceId: namespace.id } 
    });
    if (existingTable) {
      return res.status(409).json({
        message: `Table ${name} already exists in namespace ${namespaceName}`,
        type: 'TableAlreadyExistsException',
        code: 409
      });
    }
    
    const tableUuid = uuidv4();
    const warehousePath = process.env.WAREHOUSE_PATH || '/tmp/warehouse';
    const tableLocation = location || s3Service.getTableWarehousePath(warehousePath, namespaceLevels, name);
    
    const defaultPartitionSpec = {
      'spec-id': 0,
      fields: []
    };
    
    const defaultSortOrder = {
      'order-id': 0,
      fields: []
    };
    
    const table = await Table.create({
      name,
      namespaceId: namespace.id,
      location: tableLocation,
      tableUuid,
      formatVersion: 2,
      lastColumnId: schema.fields ? Math.max(...schema.fields.map(f => f.id), 0) : 0,
      schemas: [{ ...schema, 'schema-id': 0 }],
      currentSchemaId: 0,
      partitionSpecs: [defaultPartitionSpec],
      defaultSpecId: 0,
      lastPartitionId: 999,
      sortOrders: [defaultSortOrder],
      defaultSortOrderId: 0,
      snapshots: [],
      properties,
      metadata: {
        'format-version': 2,
        'table-uuid': tableUuid,
        location: tableLocation,
        'last-sequence-number': 0,
        'last-updated-ms': Date.now(),
        'last-column-id': schema.fields ? Math.max(...schema.fields.map(f => f.id), 0) : 0,
        schemas: [{ ...schema, 'schema-id': 0 }],
        'current-schema-id': 0,
        'partition-specs': [defaultPartitionSpec],
        'default-spec-id': 0,
        'last-partition-id': 999,
        'sort-orders': [defaultSortOrder],
        'default-sort-order-id': 0,
        snapshots: [],
        refs: {},
        properties
      }
    });
    
    res.json({
      'metadata-location': `${tableLocation}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata: table.metadata
    });
  } catch (error) {
    console.error('Error in createTable:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const getTable = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const tableName = req.params.table;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const table = await Table.findOne({ 
      where: { name: tableName, namespaceId: namespace.id } 
    });
    if (!table) {
      return res.status(404).json({
        message: `Table ${tableName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchTableException',
        code: 404
      });
    }
    
    res.json({
      'metadata-location': `${table.location}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata: table.metadata
    });
  } catch (error) {
    console.error('Error in getTable:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const updateTable = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const tableName = req.params.table;
    const { updates = [] } = req.body;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const table = await Table.findOne({ 
      where: { name: tableName, namespaceId: namespace.id } 
    });
    if (!table) {
      return res.status(404).json({
        message: `Table ${tableName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchTableException',
        code: 404
      });
    }
    
    let updatedMetadata = { ...table.metadata };
    updatedMetadata['last-updated-ms'] = Date.now();
    
    await table.update({ metadata: updatedMetadata });
    
    res.json({
      'metadata-location': `${table.location}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata: updatedMetadata
    });
  } catch (error) {
    console.error('Error in updateTable:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const deleteTable = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const tableName = req.params.table;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const table = await Table.findOne({ 
      where: { name: tableName, namespaceId: namespace.id } 
    });
    if (!table) {
      return res.status(404).json({
        message: `Table ${tableName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchTableException',
        code: 404
      });
    }
    
    await table.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteTable:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const renameTable = async (req, res) => {
  try {
    const { source, destination } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({
        message: 'Source and destination table identifiers are required',
        type: 'BadRequestException',
        code: 400
      });
    }
    
    const sourceNamespaceName = formatNamespace(source.namespace);
    const destNamespaceName = formatNamespace(destination.namespace);
    
    const sourceNamespace = await Namespace.findOne({ where: { name: sourceNamespaceName } });
    if (!sourceNamespace) {
      return res.status(404).json({
        message: `Source namespace ${sourceNamespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const destNamespace = await Namespace.findOne({ where: { name: destNamespaceName } });
    if (!destNamespace) {
      return res.status(404).json({
        message: `Destination namespace ${destNamespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const sourceTable = await Table.findOne({
      where: { name: source.name, namespaceId: sourceNamespace.id }
    });
    if (!sourceTable) {
      return res.status(404).json({
        message: `Table ${source.name} does not exist in namespace ${sourceNamespaceName}`,
        type: 'NoSuchTableException',
        code: 404
      });
    }
    
    const destTable = await Table.findOne({
      where: { name: destination.name, namespaceId: destNamespace.id }
    });
    if (destTable) {
      return res.status(409).json({
        message: `Table ${destination.name} already exists in namespace ${destNamespaceName}`,
        type: 'TableAlreadyExistsException',
        code: 409
      });
    }
    
    await sourceTable.update({
      name: destination.name,
      namespaceId: destNamespace.id,
      location: `${destNamespaceName}/${destination.name}`
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error in renameTable:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const reportTableMetrics = async (req, res) => {
  try {
    res.status(204).send();
  } catch (error) {
    console.error('Error in reportTableMetrics:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const getTableCredentials = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const tableName = req.params.table;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const table = await Table.findOne({ 
      where: { name: tableName, namespaceId: namespace.id } 
    });
    if (!table) {
      return res.status(404).json({
        message: `Table ${tableName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchTableException',
        code: 404
      });
    }
    
    // Check if table uses S3 storage
    if (!s3Service.isS3Warehouse(table.location)) {
      return res.status(400).json({
        message: 'Table does not use S3 storage',
        type: 'BadRequestException',
        code: 400
      });
    }
    
    // Return S3 credentials for client to access table data
    const credentials = {
      'aws.region': process.env.AWS_REGION || 'us-east-1',
      'aws.access-key-id': process.env.AWS_ACCESS_KEY_ID,
      'aws.secret-access-key': process.env.AWS_SECRET_ACCESS_KEY
    };
    
    // Add endpoint if using S3-compatible service
    if (process.env.S3_ENDPOINT) {
      credentials['s3.endpoint'] = process.env.S3_ENDPOINT;
      credentials['s3.path-style-access'] = 'true';
    }
    
    res.json(credentials);
  } catch (error) {
    console.error('Error in getTableCredentials:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

module.exports = {
  listTables,
  createTable,
  getTable,
  updateTable,
  deleteTable,
  renameTable,
  reportTableMetrics,
  getTableCredentials
};