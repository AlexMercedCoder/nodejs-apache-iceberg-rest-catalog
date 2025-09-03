const { View, Namespace } = require('../models');
const { v4: uuidv4 } = require('uuid');

const parseNamespace = (namespaceStr) => {
  return namespaceStr.split('%1F');
};

const formatNamespace = (levels) => {
  return levels.join('%1F');
};

const listViews = async (req, res) => {
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
    
    const views = await View.findAll({
      where: { namespaceId: namespace.id },
      limit: pageSize + 1,
      order: [['name', 'ASC']]
    });
    
    const hasMore = views.length > pageSize;
    const items = hasMore ? views.slice(0, -1) : views;
    
    const response = {
      identifiers: items.map(view => ({
        namespace: namespaceLevels,
        name: view.name
      }))
    };
    
    if (hasMore && items.length > 0) {
      response['next-page-token'] = items[items.length - 1].id;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in listViews:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const createView = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const { name, schema, 'view-version': viewVersion, properties = {} } = req.body;
    
    if (!name || !schema || !viewVersion) {
      return res.status(400).json({
        message: 'View name, schema, and view-version are required',
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
    
    const existingView = await View.findOne({ 
      where: { name, namespaceId: namespace.id } 
    });
    if (existingView) {
      return res.status(409).json({
        message: `View ${name} already exists in namespace ${namespaceName}`,
        type: 'ViewAlreadyExistsException',
        code: 409
      });
    }
    
    const viewUuid = uuidv4();
    const location = `${namespaceName}/${name}`;
    
    const view = await View.create({
      name,
      namespaceId: namespace.id,
      location,
      viewUuid,
      formatVersion: 1,
      currentVersionId: 1,
      versions: [viewVersion],
      versionLog: [{
        'version-id': 1,
        'timestamp-ms': Date.now()
      }],
      schemas: [schema],
      properties
    });
    
    const metadata = {
      'view-uuid': viewUuid,
      'format-version': 1,
      location,
      'current-version-id': 1,
      versions: [viewVersion],
      'version-log': view.versionLog,
      schemas: [schema],
      properties
    };
    
    res.json({
      'metadata-location': `${location}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata
    });
  } catch (error) {
    console.error('Error in createView:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const getView = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const viewName = req.params.view;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const view = await View.findOne({ 
      where: { name: viewName, namespaceId: namespace.id } 
    });
    if (!view) {
      return res.status(404).json({
        message: `View ${viewName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchViewException',
        code: 404
      });
    }
    
    const metadata = {
      'view-uuid': view.viewUuid,
      'format-version': view.formatVersion,
      location: view.location,
      'current-version-id': view.currentVersionId,
      versions: view.versions,
      'version-log': view.versionLog,
      schemas: view.schemas,
      properties: view.properties
    };
    
    res.json({
      'metadata-location': `${view.location}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata
    });
  } catch (error) {
    console.error('Error in getView:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const updateView = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const viewName = req.params.view;
    const { updates = [] } = req.body;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const view = await View.findOne({ 
      where: { name: viewName, namespaceId: namespace.id } 
    });
    if (!view) {
      return res.status(404).json({
        message: `View ${viewName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchViewException',
        code: 404
      });
    }
    
    const metadata = {
      'view-uuid': view.viewUuid,
      'format-version': view.formatVersion,
      location: view.location,
      'current-version-id': view.currentVersionId,
      versions: view.versions,
      'version-log': view.versionLog,
      schemas: view.schemas,
      properties: view.properties
    };
    
    res.json({
      'metadata-location': `${view.location}/metadata/00000-${uuidv4()}.metadata.json`,
      metadata
    });
  } catch (error) {
    console.error('Error in updateView:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const deleteView = async (req, res) => {
  try {
    const namespaceLevels = parseNamespace(req.params.namespace);
    const namespaceName = formatNamespace(namespaceLevels);
    const viewName = req.params.view;
    
    const namespace = await Namespace.findOne({ where: { name: namespaceName } });
    if (!namespace) {
      return res.status(404).json({
        message: `Namespace ${namespaceName} does not exist`,
        type: 'NoSuchNamespaceException',
        code: 404
      });
    }
    
    const view = await View.findOne({ 
      where: { name: viewName, namespaceId: namespace.id } 
    });
    if (!view) {
      return res.status(404).json({
        message: `View ${viewName} does not exist in namespace ${namespaceName}`,
        type: 'NoSuchViewException',
        code: 404
      });
    }
    
    await view.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteView:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

const renameView = async (req, res) => {
  try {
    const { source, destination } = req.body;
    
    if (!source || !destination) {
      return res.status(400).json({
        message: 'Source and destination view identifiers are required',
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
    
    const sourceView = await View.findOne({
      where: { name: source.name, namespaceId: sourceNamespace.id }
    });
    if (!sourceView) {
      return res.status(404).json({
        message: `View ${source.name} does not exist in namespace ${sourceNamespaceName}`,
        type: 'NoSuchViewException',
        code: 404
      });
    }
    
    const destView = await View.findOne({
      where: { name: destination.name, namespaceId: destNamespace.id }
    });
    if (destView) {
      return res.status(409).json({
        message: `View ${destination.name} already exists in namespace ${destNamespaceName}`,
        type: 'ViewAlreadyExistsException',
        code: 409
      });
    }
    
    await sourceView.update({
      name: destination.name,
      namespaceId: destNamespace.id,
      location: `${destNamespaceName}/${destination.name}`
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error in renameView:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

module.exports = {
  listViews,
  createView,
  getView,
  updateView,
  deleteView,
  renameView
};