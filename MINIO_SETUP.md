# MinIO S3-Compatible Storage Setup Guide

This guide explains how to use the REST Catalog server with MinIO S3-compatible object storage for Apache Iceberg table data.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Spark Client  │    │  REST Catalog   │    │     MinIO       │
│   (Jupyter)     │◄──►│     Server      │◄──►│  S3 Storage     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        Direct S3 API access
                        for table data I/O
```

## Features

- **S3-Compatible API**: Full AWS S3 API compatibility
- **Local Development**: No external cloud dependencies
- **Web Console**: Browser-based management interface
- **Automatic Setup**: Buckets created and configured automatically
- **Versioning**: Object versioning enabled for data integrity
- **Performance**: High-performance object storage optimized for analytics

## Quick Start

### 1. Start Services

```bash
# Copy environment template
cp .env.docker .env

# Start all services (includes MinIO)
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Access MinIO Console

Open http://localhost:9001 in your browser:

- **Username**: `minioadmin`
- **Password**: `minioadmin`

### 3. Verify Bucket Setup

The following buckets are automatically created:

- **`warehouse`**: Main Iceberg table storage
- **`data`**: Additional data storage
- **`logs`**: Log file storage

### 4. Test S3 Connectivity

```bash
# Test MinIO health
curl -f http://localhost:9000/minio/health/live

# List buckets using AWS CLI (if installed)
aws --endpoint-url http://localhost:9000 s3 ls
```

## Configuration Options

### Environment Variables

Edit your `.env` file:

```bash
# Storage configuration
WAREHOUSE_PATH=s3://warehouse

# MinIO credentials
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://minio:9000
AWS_REGION=us-east-1
```

### Custom Credentials

For security, change the default credentials:

```bash
# In .env file
AWS_ACCESS_KEY_ID=your_custom_user
AWS_SECRET_ACCESS_KEY=your_secure_password
```

Then restart services:

```bash
docker-compose down
docker-compose up -d
```

### External MinIO

To use an external MinIO instance:

```bash
# In .env file
S3_ENDPOINT=http://your-minio-host:9000
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Spark Configuration

### Basic Spark Session with MinIO

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Iceberg with MinIO") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://rest-catalog:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "s3://warehouse") \
    .config("spark.sql.defaultCatalog", "rest") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false") \
    .getOrCreate()
```

### Advanced Configuration

```python
spark = SparkSession.builder \
    .appName("Advanced Iceberg MinIO") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://rest-catalog:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "s3://warehouse") \
    .config("spark.sql.defaultCatalog", "rest") \
    # MinIO S3 configuration
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    # Performance optimizations
    .config("spark.hadoop.fs.s3a.block.size", "134217728")  # 128MB \
    .config("spark.hadoop.fs.s3a.buffer.dir", "/tmp") \
    .config("spark.hadoop.fs.s3a.committer.name", "directory") \
    .config("spark.hadoop.fs.s3a.committer.staging.conflict-mode", "append") \
    .config("spark.hadoop.fs.s3a.committer.staging.tmp.path", "/tmp/staging") \
    .config("spark.hadoop.fs.s3a.committer.staging.unique-filenames", "true") \
    # Iceberg optimizations
    .config("spark.sql.iceberg.vectorization.enabled", "true") \
    .config("spark.sql.iceberg.target-file-size-bytes", "134217728") \
    .getOrCreate()
```

## Working with Data

### Create and Use Tables

```python
# Create namespace
spark.sql("CREATE NAMESPACE IF NOT EXISTS rest.analytics")

# Create table
spark.sql("""
CREATE TABLE rest.analytics.sales (
    id BIGINT,
    customer_id STRING,
    product_name STRING,
    amount DECIMAL(10,2),
    sale_date DATE,
    region STRING
) USING ICEBERG
PARTITIONED BY (region)
LOCATION 's3://warehouse/analytics/sales'
""")

# Insert data
spark.sql("""
INSERT INTO rest.analytics.sales VALUES
    (1, 'CUST_001', 'Laptop', 999.99, '2024-01-15', 'US'),
    (2, 'CUST_002', 'Mouse', 29.99, '2024-01-16', 'EU'),
    (3, 'CUST_003', 'Keyboard', 79.99, '2024-01-17', 'APAC')
""")

# Query data
spark.sql("SELECT * FROM rest.analytics.sales").show()
```

### Verify S3 Storage

After creating tables, you can verify the data in MinIO:

1. **Access MinIO Console**: http://localhost:9001
2. **Navigate to warehouse bucket**
3. **Browse to**: `analytics/sales/`
4. **View files**: Parquet files and metadata

## Data Organization

### Bucket Structure

```
warehouse/
├── analytics/
│   ├── sales/
│   │   ├── metadata/
│   │   │   ├── 00000-uuid.metadata.json
│   │   │   └── snap-123456789.avro
│   │   └── data/
│   │       ├── region=US/
│   │       ├── region=EU/
│   │       └── region=APAC/
│   └── customers/
└── logs/
    └── application/
```

### File Types

- **`.metadata.json`**: Iceberg table metadata
- **`.avro`**: Iceberg manifest files
- **`.parquet`**: Actual table data files

## Management Tasks

### Backup and Restore

```bash
# Create backup
docker run --rm \
  -v rest-catalog_minio_data:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio_backup.tar.gz -C /source .

# Restore backup
docker run --rm \
  -v rest-catalog_minio_data:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/minio_backup.tar.gz -C /target
```

### Monitor Storage Usage

```python
# In Spark notebook
# Show table files and sizes
spark.sql("""
SELECT 
    file_path,
    file_format,
    record_count,
    file_size_in_bytes / 1024 / 1024 as size_mb
FROM rest.analytics.sales.files
ORDER BY file_size_in_bytes DESC
""").show(truncate=False)

# Show storage summary
spark.sql("""
SELECT 
    COUNT(*) as file_count,
    SUM(record_count) as total_records,
    SUM(file_size_in_bytes) / 1024 / 1024 as total_size_mb
FROM rest.analytics.sales.files
""").show()
```

### Cleanup Old Data

```python
# Remove old snapshots (keep last 10)
spark.sql("""
CALL rest.system.expire_snapshots(
    table => 'analytics.sales',
    retain_last => 10
)
""")

# Remove orphan files
spark.sql("""
CALL rest.system.remove_orphan_files(
    table => 'analytics.sales'
)
""")
```

## Production Considerations

### Security

1. **Change default credentials**:
   ```bash
   AWS_ACCESS_KEY_ID=production_user
   AWS_SECRET_ACCESS_KEY=secure_password_here
   ```

2. **Use IAM policies** for fine-grained access control

3. **Enable TLS**:
   ```bash
   # Add to MinIO environment
   MINIO_OPTS="--certs-dir /certs"
   ```

### Performance

1. **Increase buffer sizes**:
   ```python
   .config("spark.hadoop.fs.s3a.block.size", "268435456")  # 256MB
   .config("spark.hadoop.fs.s3a.multipart.size", "104857600")  # 100MB
   ```

2. **Use connection pooling**:
   ```python
   .config("spark.hadoop.fs.s3a.connection.maximum", "100")
   .config("spark.hadoop.fs.s3a.threads.max", "20")
   ```

3. **Enable compression**:
   ```python
   .config("spark.sql.parquet.compression.codec", "snappy")
   ```

### Monitoring

1. **Enable MinIO metrics**:
   ```bash
   # Add to MinIO environment
   MINIO_PROMETHEUS_AUTH_TYPE=public
   ```

2. **Monitor via console**: http://localhost:9001/metrics

3. **Custom monitoring**:
   ```python
   # Monitor table health
   spark.sql("SELECT * FROM rest.analytics.sales.snapshots").show()
   spark.sql("SELECT * FROM rest.analytics.sales.history").show()
   ```

## Troubleshooting

### Common Issues

**Connection Refused**
```bash
# Check MinIO is running
docker-compose ps minio
docker-compose logs minio
```

**Access Denied**
```bash
# Verify credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

**Bucket Not Found**
```bash
# Recreate buckets
docker-compose restart minio-init
docker-compose logs minio-init
```

**Slow Performance**
- Increase Spark executor memory
- Use larger S3A buffer sizes
- Enable S3A committer optimizations

### Debug Commands

```bash
# Test S3 connectivity
curl -v http://localhost:9000/warehouse/

# MinIO client commands
docker run --rm -it --network rest-catalog_iceberg-network \
  minio/mc:latest \
  mc alias set minio http://minio:9000 minioadmin minioadmin

docker run --rm -it --network rest-catalog_iceberg-network \
  minio/mc:latest \
  mc ls minio/warehouse
```

## Migration

### From Local Filesystem

```python
# Read from local
df = spark.read.parquet("file:///local/path/data.parquet")

# Write to MinIO S3
df.writeTo("rest.analytics.migrated_data").create()
```

### To AWS S3

```python
# Export from MinIO
df = spark.read.table("rest.analytics.sales")

# Write to AWS S3 (reconfigure S3 settings)
df.write.mode("overwrite").parquet("s3a://aws-bucket/iceberg/sales/")
```

## Next Steps

1. **Explore the [Complete Notebook Examples](NOTEBOOK_EXAMPLES.md)**
2. **Read the [Docker Setup Guide](DOCKER_SETUP.md)**
3. **Try advanced Iceberg features** (branching, time travel)
4. **Set up monitoring and alerting**
5. **Scale to production** with external MinIO cluster

This MinIO setup provides a complete S3-compatible storage solution for Apache Iceberg development and testing! 🚀