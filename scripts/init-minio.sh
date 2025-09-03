#!/bin/bash
# MinIO initialization script

set -e

echo "🚀 Initializing MinIO for Iceberg warehouse..."

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO to be ready..."
until mc alias set minio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin}; do
  echo "MinIO not ready yet, retrying in 5 seconds..."
  sleep 5
done

echo "✅ MinIO connection established"

# Create warehouse bucket
echo "📁 Creating warehouse bucket..."
mc mb minio/warehouse --ignore-existing || true

# Set bucket policy for development (adjust for production)
echo "🔒 Setting bucket policy..."
mc policy set download minio/warehouse || true

# Create additional buckets if needed
echo "📁 Creating additional buckets..."
mc mb minio/data --ignore-existing || true
mc mb minio/logs --ignore-existing || true

# Set versioning (optional)
echo "📝 Enabling versioning..."
mc version enable minio/warehouse || true

echo "🎉 MinIO initialization completed successfully!"

# List buckets to verify
echo "📋 Available buckets:"
mc ls minio/