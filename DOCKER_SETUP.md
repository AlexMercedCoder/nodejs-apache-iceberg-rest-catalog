# Docker Compose Setup for REST Catalog & Spark Notebook

This guide walks you through setting up a complete Apache Iceberg development environment using Docker Compose, including the REST Catalog server and Spark notebook with Jupyter.

## Architecture Overview

The Docker Compose setup includes:

- **REST Catalog Server**: ExpressJS server implementing Iceberg REST Catalog API
- **Spark Notebook**: Jupyter notebook with Spark 3.5 and Iceberg support
- **MinIO**: S3-compatible object storage for Iceberg table data
- **PostgreSQL** (optional): Database backend for production use
- **Shared Network**: All services communicate on `iceberg-network`
- **Persistent Volumes**: Data persistence across container restarts

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ available memory
- At least 10GB free disk space

## Quick Start

### 1. Environment Setup

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` file to configure your setup:

```bash
# Basic configuration
DB_TYPE=sqlite
NODE_ENV=development

# Storage configuration
WAREHOUSE_PATH=s3://warehouse  # Use MinIO for object storage

# MinIO configuration (default credentials)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://minio:9000
```

### 2. Start the Environment

**Option A: Default setup (SQLite + MinIO S3)**
```bash
docker-compose up -d
```

This will start:
- REST Catalog server with SQLite database
- MinIO S3-compatible storage
- Spark notebook with Jupyter
- Automatic MinIO bucket initialization

**Option B: With PostgreSQL backend**
```bash
# Configure PostgreSQL in .env
DB_TYPE=postgres
DB_PASSWORD=your_secure_password

# Start with PostgreSQL
docker-compose --profile postgres up -d
```

**Option C: Local filesystem storage (no S3)**
```bash
# Edit .env file
WAREHOUSE_PATH=file:///tmp/warehouse

# Start services
docker-compose up -d
```

### 3. Verify Services

Check that all services are running:

```bash
docker-compose ps
```

Expected output:
```
NAME                IMAGE                        STATUS        PORTS
rest-catalog        rest-catalog:latest         Up (healthy)  0.0.0.0:3000->3000/tcp
spark-notebook      alexmerced/spark35nb:latest Up            0.0.0.0:8888->8888/tcp, ...
minio               minio/minio:latest          Up (healthy)  0.0.0.0:9000->9000/tcp, ...
```

### 4. Access Services

- **REST Catalog UI**: http://localhost:3000
- **Jupyter Notebook**: http://localhost:8888 (token will be shown in logs)
- **Spark Master UI**: http://localhost:8080
- **Spark Application UI**: http://localhost:4040 (when running jobs)
- **MinIO Console**: http://localhost:9001 (admin UI for object storage)
- **MinIO API**: http://localhost:9000 (S3-compatible API)

## Service Details

### REST Catalog Server

- **Container**: `rest-catalog`
- **Port**: 3000
- **Health Check**: Automated health monitoring
- **Data Persistence**: 
  - SQLite database: `catalog_data` volume
  - Warehouse data: `iceberg_warehouse` volume

### Spark Notebook

- **Container**: `spark-notebook`
- **Jupyter Port**: 8888
- **Spark UI Port**: 8080
- **Pre-installed**: Spark 3.5, Iceberg, Python libraries
- **Notebook Persistence**: `spark_notebooks` volume

### MinIO Object Storage

- **Container**: `minio`
- **API Port**: 9000 (S3-compatible API)
- **Console Port**: 9001 (Web admin interface)
- **Default Credentials**: minioadmin / minioadmin
- **Data Persistence**: `minio_data` volume
- **Auto-created Buckets**: `warehouse`, `data`, `logs`
- **Features**: Versioning enabled, public download policy for development

### PostgreSQL (Optional)

- **Container**: `catalog-postgres`
- **Port**: 5432 (internal only)
- **Data Persistence**: `postgres_data` volume

## Configuration Options

### Database Backend Selection

Edit `.env` file:

**In-Memory (Development)**
```bash
DB_TYPE=memory
```

**SQLite (Development/Testing)**
```bash
DB_TYPE=sqlite
DB_PATH=/app/data/catalog.db
```

**PostgreSQL (Production)**
```bash
DB_TYPE=postgres
DB_NAME=catalog
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=postgres
DB_PORT=5432
```

### Storage Backend Selection

**MinIO S3-Compatible (Default)**
```bash
WAREHOUSE_PATH=s3://warehouse
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://minio:9000
```

**AWS S3 (Production)**
```bash
WAREHOUSE_PATH=s3://your-iceberg-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
# Remove S3_ENDPOINT for real AWS S3
```

**Local Filesystem**
```bash
WAREHOUSE_PATH=file:///tmp/warehouse
# Remove S3-related environment variables
```

### MinIO Configuration

**Custom Credentials**
```bash
AWS_ACCESS_KEY_ID=your_minio_user
AWS_SECRET_ACCESS_KEY=your_secure_password
```

**External MinIO Instance**
```bash
S3_ENDPOINT=http://your-minio-host:9000
```

**Production MinIO Settings**
```bash
# Disable public access, use IAM policies
MINIO_BROWSER=off
MINIO_PROMETHEUS_AUTH_TYPE=public
```

## Getting Started with Notebooks

### 1. Access Jupyter

Get the Jupyter token:

```bash
docker-compose logs spark-notebook | grep token
```

Or set a custom token:

```bash
# Add to docker-compose.yml under spark service environment:
- JUPYTER_TOKEN=your_custom_token
```

### 2. Open Notebook

Navigate to http://localhost:8888 and enter the token.

### 3. Test Connection

Create a new Python notebook and test the setup:

```python
# Test REST Catalog connection
import requests

response = requests.get('http://rest-catalog:3000/v1/config')
print("Catalog Status:", response.status_code)
print("Config:", response.json())
```

## Working with Iceberg Tables

### Create Your First Notebook

Create a new notebook with the following content:

```python
from pyspark.sql import SparkSession

# Create Spark session with Iceberg and REST Catalog
spark = SparkSession.builder \
    .appName("Docker Iceberg Demo") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://rest-catalog:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "/opt/spark/warehouse") \
    .config("spark.sql.defaultCatalog", "rest") \
    .getOrCreate()

# Set log level
spark.sparkContext.setLogLevel("WARN")

print("✅ Spark session created with Iceberg support!")
print(f"Spark version: {spark.version}")
```

### Create Namespace and Table

```python
# Create a namespace
spark.sql("CREATE NAMESPACE IF NOT EXISTS rest.demo")
print("✅ Namespace created")

# Create a table
spark.sql("""
CREATE TABLE IF NOT EXISTS rest.demo.sales (
    id BIGINT,
    customer STRING,
    product STRING,
    amount DECIMAL(10,2),
    sale_date DATE,
    region STRING
) USING ICEBERG
PARTITIONED BY (region)
""")
print("✅ Table created")

# Show tables
spark.sql("SHOW TABLES IN rest.demo").show()
```

### Insert and Query Data

```python
# Insert sample data
spark.sql("""
INSERT INTO rest.demo.sales VALUES
    (1, 'Alice', 'Laptop', 999.99, '2024-01-15', 'North'),
    (2, 'Bob', 'Mouse', 29.99, '2024-01-16', 'South'),
    (3, 'Carol', 'Keyboard', 79.99, '2024-01-17', 'East'),
    (4, 'David', 'Monitor', 299.99, '2024-01-18', 'West')
""")

# Query data
result = spark.sql("SELECT * FROM rest.demo.sales ORDER BY amount DESC")
result.show()

# Aggregation query
spark.sql("""
SELECT region, 
       COUNT(*) as sales_count, 
       SUM(amount) as total_sales
FROM rest.demo.sales 
GROUP BY region 
ORDER BY total_sales DESC
""").show()
```

## Management and Monitoring

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f rest-catalog
docker-compose logs -f spark-notebook
```

### Monitor Resources

```bash
# Resource usage
docker-compose top

# System resources
docker stats
```

### Health Checks

```bash
# Check catalog health
curl -f http://localhost:3000/v1/config

# Check Spark master
curl -f http://localhost:8080
```

## Data Persistence

### Volumes Created

- `catalog_data`: SQLite database files
- `iceberg_warehouse`: Iceberg table data files  
- `spark_notebooks`: Jupyter notebook files
- `postgres_data`: PostgreSQL data (if using)

### Backup Data

```bash
# Backup notebook files
docker cp spark-notebook:/home/jovyan/work ./notebook_backup

# Backup warehouse data
docker run --rm -v rest-catalog_iceberg_warehouse:/source -v $(pwd):/backup alpine tar czf /backup/warehouse_backup.tar.gz -C /source .
```

### Restore Data

```bash
# Restore notebooks
docker cp ./notebook_backup/. spark-notebook:/home/jovyan/work/

# Restore warehouse
docker run --rm -v rest-catalog_iceberg_warehouse:/target -v $(pwd):/backup alpine tar xzf /backup/warehouse_backup.tar.gz -C /target
```

## Troubleshooting

### Common Issues

**1. Services won't start**
```bash
# Check logs
docker-compose logs

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**2. Connection refused between services**
```bash
# Check network
docker network ls
docker network inspect rest-catalog_iceberg-network

# Verify service names
docker-compose exec spark-notebook ping rest-catalog
```

**3. Jupyter token issues**
```bash
# Get current token
docker-compose logs spark-notebook | grep -E "token=|127.0.0.1"

# Reset Jupyter
docker-compose restart spark-notebook
```

**4. Permission issues**
```bash
# Fix permissions
docker-compose exec spark-notebook chown -R jovyan:users /home/jovyan/work
```

### Performance Tuning

**Memory Settings**

Edit `.env`:
```bash
SPARK_DRIVER_MEMORY=4g
SPARK_EXECUTOR_MEMORY=4g
```

**Docker Resources**

Increase Docker Desktop memory allocation to 4GB+.

### Debug Mode

Enable verbose logging:

```yaml
# Add to docker-compose.yml environment
- NODE_ENV=development
- DEBUG=*
```

## Production Considerations

### Security

1. **Change default passwords**
2. **Use environment secrets**
3. **Enable HTTPS/TLS**
4. **Network isolation**

### Scaling

1. **Use external PostgreSQL**
2. **External object storage (S3)**
3. **Load balancer for catalog**
4. **Separate Spark cluster**

### Monitoring

1. **Add Prometheus metrics**
2. **Log aggregation**
3. **Health check endpoints**
4. **Alert configuration**

## Cleanup

### Stop Services

```bash
# Stop but keep data
docker-compose down

# Stop and remove volumes (⚠️ DATA LOSS)
docker-compose down -v
```

### Remove Everything

```bash
# Remove all containers, networks, and volumes
docker-compose down -v --rmi all

# Clean up system
docker system prune -a
```

## Advanced Usage

### Custom Spark Configuration

Create `spark-defaults.conf`:

```bash
# Mount custom config
volumes:
  - ./spark-defaults.conf:/opt/spark/conf/spark-defaults.conf
```

### Multiple Catalogs

Configure multiple catalogs in Spark:

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.rest1", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest1.type", "rest") \
    .config("spark.sql.catalog.rest1.uri", "http://rest-catalog:3000/v1") \
    .config("spark.sql.catalog.rest2", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest2.type", "rest") \
    .config("spark.sql.catalog.rest2.uri", "http://other-catalog:3000/v1") \
    .getOrCreate()
```

### S3-Compatible Storage

For MinIO or other S3-compatible storage:

```yaml
environment:
  - AWS_ENDPOINT_URL=http://minio:9000
  - AWS_ACCESS_KEY_ID=minioadmin
  - AWS_SECRET_ACCESS_KEY=minioadmin
```

## Next Steps

1. **Explore the [Jupyter Notebook Examples](NOTEBOOK_EXAMPLES.md)**
2. **Read the [PySpark Setup Guide](PYSPARK_SETUP.md)**
3. **Check the [REST API Documentation](README.md)**
4. **Try advanced Iceberg features (time travel, schema evolution)**

This Docker setup provides a complete development environment for Apache Iceberg with minimal configuration. Happy coding! 🚀