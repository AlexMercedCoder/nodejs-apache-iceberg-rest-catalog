const getConfig = async (req, res) => {
  try {
    const warehouse = req.query.warehouse;
    
    const config = {
      defaults: {
        warehouse: warehouse || 'file:///tmp/warehouse',
        'catalog-impl': 'org.apache.iceberg.rest.RESTCatalog',
        clients: '10'
      },
      overrides: {},
      endpoints: [
        'GET /v1/{prefix}/namespaces',
        'POST /v1/{prefix}/namespaces',
        'GET /v1/{prefix}/namespaces/{namespace}',
        'DELETE /v1/{prefix}/namespaces/{namespace}',
        'POST /v1/{prefix}/namespaces/{namespace}/properties',
        'GET /v1/{prefix}/namespaces/{namespace}/tables',
        'POST /v1/{prefix}/namespaces/{namespace}/tables',
        'GET /v1/{prefix}/namespaces/{namespace}/tables/{table}',
        'POST /v1/{prefix}/namespaces/{namespace}/tables/{table}',
        'DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}',
        'POST /v1/{prefix}/namespaces/{namespace}/register',
        'POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/metrics',
        'POST /v1/{prefix}/tables/rename',
        'POST /v1/{prefix}/transactions/commit',
        'GET /v1/{prefix}/namespaces/{namespace}/views',
        'POST /v1/{prefix}/namespaces/{namespace}/views',
        'GET /v1/{prefix}/namespaces/{namespace}/views/{view}',
        'POST /v1/{prefix}/namespaces/{namespace}/views/{view}',
        'DELETE /v1/{prefix}/namespaces/{namespace}/views/{view}',
        'POST /v1/{prefix}/views/rename'
      ]
    };

    if (warehouse) {
      config.overrides.warehouse = warehouse;
    }

    res.json(config);
  } catch (error) {
    console.error('Error in getConfig:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

module.exports = {
  getConfig
};