const s3Service = require('../config/s3');

const getConfig = async (req, res) => {
  try {
    const warehouse = req.query.warehouse;
    const defaultWarehouse = process.env.WAREHOUSE_PATH || 'file:///tmp/warehouse';
    
    const config = {
      defaults: {
        warehouse: warehouse || defaultWarehouse,
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

    // Add S3 configuration if using S3 warehouse
    const finalWarehouse = warehouse || defaultWarehouse;
    if (s3Service.isS3Warehouse(finalWarehouse)) {
      // Add S3-specific configuration
      config.defaults['s3.endpoint'] = process.env.S3_ENDPOINT;
      config.defaults['s3.path-style-access'] = 'true';
      config.defaults['s3.access-key-id'] = process.env.AWS_ACCESS_KEY_ID;
      config.defaults['s3.secret-access-key'] = process.env.AWS_SECRET_ACCESS_KEY;
      config.defaults['s3.region'] = process.env.AWS_REGION || 'us-east-1';
      
      // Add vended credentials endpoint
      config.endpoints.push('POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/credentials');
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