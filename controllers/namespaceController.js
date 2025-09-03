const { Namespace } = require('../models');
const { Op } = require('sequelize');

const parseNamespace = (namespaceStr) => {
  return namespaceStr.split('%1F');
};

const formatNamespace = (levels) => {
  return levels.join('%1F');
};

const listNamespaces = async (req, res) => {
  try {
    const pageToken = req.query.pageToken;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 100;
    const parent = req.query.parent;
    
    let whereClause = {};
    
    if (parent) {
      const parentLevels = parseNamespace(parent);
      whereClause.levels = {
        [Op.like]: `${JSON.stringify(parentLevels).slice(0, -1)}%`
      };
    }
    
    const namespaces = await Namespace.findAll({
      where: whereClause,
      limit: pageSize + 1,
      order: [['name', 'ASC']]
    });
    
    const hasMore = namespaces.length > pageSize;
    const items = hasMore ? namespaces.slice(0, -1) : namespaces;
    
    const response = {
      namespaces: items.map(ns => ({
        namespace: ns.levels,
        properties: ns.properties
      }))
    };
    
    if (hasMore && items.length > 0) {
      response['next-page-token'] = items[items.length - 1].id;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in listNamespaces:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const createNamespace = async (req, res) => {
  try {
    const { namespace, properties = {} } = req.body;
    
    if (!namespace || !Array.isArray(namespace) || namespace.length === 0) {
      return res.status(400).json({
        message: 'Invalid namespace format',
        type: 'BadRequestException',
        code: 400
      });
    }
    
    const name = formatNamespace(namespace);
    
    const existingNamespace = await Namespace.findOne({ where: { name } });
    if (existingNamespace) {
      return res.status(409).json({
        message: `Namespace ${name} already exists`,
        type: 'NamespaceAlreadyExistsException',
        code: 409
      });
    }
    
    const newNamespace = await Namespace.create({
      name,
      levels: namespace,
      properties
    });
    
    res.status(200).json({
      namespace: newNamespace.levels,
      properties: newNamespace.properties
    });
  } catch (error) {
    console.error('Error in createNamespace:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const getNamespace = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const name = formatNamespace(namespaceLevels);
    
    const namespace = await Namespace.findOne({ where: { name } });
    
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${name} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    res.json({
      namespace: namespace.levels,
      properties: namespace.properties
    });
  } catch (error) {
    console.error('Error in getNamespace:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const deleteNamespace = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const name = formatNamespace(namespaceLevels);
    
    const namespace = await Namespace.findOne({ where: { name } });
    
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${name} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    await namespace.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteNamespace:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const updateNamespaceProperties = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const name = formatNamespace(namespaceLevels);
    const { updates = {}, removals = [] } = req.body;
    
    const namespace = await Namespace.findOne({ where: { name } });
    
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${name} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    let properties = { ...namespace.properties };
    
    Object.keys(updates).forEach(key => {
      properties[key] = updates[key];
    });
    
    removals.forEach(key => {
      delete properties[key];
    });
    
    await namespace.update({ properties });
    
    res.json({
      updated: Object.keys(updates),
      removed: removals,
      missing: []
    });
  } catch (error) {
    console.error('Error in updateNamespaceProperties:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

module.exports = {
  listNamespaces,
  createNamespace,
  getNamespace,
  deleteNamespace,
  updateNamespaceProperties
};