const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// S3 Configuration
const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
  }
};

// Add endpoint for S3-compatible services (like MinIO)
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
  s3Config.forcePathStyle = true; // Required for MinIO and some S3-compatible services
}

const s3Client = new S3Client(s3Config);

// Helper functions for S3 operations
const s3Service = {
  client: s3Client,
  
  // Generate presigned URL for reading objects
  async getPresignedReadUrl(bucket, key, expiresIn = 3600) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn });
  },
  
  // Generate presigned URL for writing objects
  async getPresignedWriteUrl(bucket, key, expiresIn = 3600) {
    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn });
  },
  
  // Parse S3 path (s3://bucket/key) into components
  parseS3Path(s3Path) {
    if (!s3Path || !s3Path.startsWith('s3://')) {
      return null;
    }
    
    const pathWithoutProtocol = s3Path.substring(5);
    const firstSlashIndex = pathWithoutProtocol.indexOf('/');
    
    if (firstSlashIndex === -1) {
      return {
        bucket: pathWithoutProtocol,
        key: ''
      };
    }
    
    return {
      bucket: pathWithoutProtocol.substring(0, firstSlashIndex),
      key: pathWithoutProtocol.substring(firstSlashIndex + 1)
    };
  },
  
  // Build S3 path from components
  buildS3Path(bucket, key) {
    return `s3://${bucket}/${key}`;
  },
  
  // Check if warehouse is S3-based
  isS3Warehouse(warehousePath) {
    return warehousePath && warehousePath.startsWith('s3://');
  },
  
  // Generate warehouse path for table
  getTableWarehousePath(warehousePath, namespace, tableName) {
    const baseNamespace = Array.isArray(namespace) ? namespace.join('/') : namespace.replace(/%1F/g, '/');
    
    if (this.isS3Warehouse(warehousePath)) {
      // Ensure warehouse path ends with /
      const normalizedWarehouse = warehousePath.endsWith('/') ? warehousePath : warehousePath + '/';
      return `${normalizedWarehouse}${baseNamespace}/${tableName}`;
    } else {
      return `${warehousePath}/${baseNamespace}/${tableName}`;
    }
  },
  
  // Generate metadata file path
  getMetadataPath(tablePath, version = '00000') {
    const timestamp = Date.now().toString(16);
    const uuid = require('uuid').v4().replace(/-/g, '');
    return `${tablePath}/metadata/${version}-${timestamp}-${uuid}.metadata.json`;
  },
  
  // Generate data file path
  getDataPath(tablePath, partitionPath = '') {
    const timestamp = Date.now().toString(16);
    const uuid = require('uuid').v4().replace(/-/g, '');
    const partition = partitionPath ? `/${partitionPath}` : '';
    return `${tablePath}/data${partition}/${timestamp}-${uuid}.parquet`;
  }
};

module.exports = s3Service;