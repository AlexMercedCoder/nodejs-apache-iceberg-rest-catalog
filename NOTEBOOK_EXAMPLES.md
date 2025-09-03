# Jupyter Notebook Examples with REST Catalog

This guide provides complete notebook examples for working with the Apache Iceberg REST Catalog using Spark in the Docker environment.

## Getting Started

### 1. Start the Docker Environment

```bash
# Start all services (includes MinIO S3 storage)
docker-compose up -d

# Verify all services are running
docker-compose ps

# Get Jupyter token
docker-compose logs spark-notebook | grep token
```

### 2. Verify MinIO Setup

Check that MinIO is ready:

```bash
# Check MinIO health
curl -f http://localhost:9000/minio/health/live

# Access MinIO Console at http://localhost:9001
# Default credentials: minioadmin / minioadmin
```

### 3. Access Jupyter

Navigate to http://localhost:8888 and enter the token, then create a new Python notebook.

## Example 1: Basic Setup and Connection Test

Create a new notebook with the following cells:

### Cell 1: Import Libraries and Test Connections

```python
import requests
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import json
from datetime import datetime, date

# Test REST Catalog connection
print("🔍 Testing REST Catalog connection...")
try:
    response = requests.get('http://rest-catalog:3000/v1/config')
    if response.status_code == 200:
        print("✅ REST Catalog is accessible!")
        config = response.json()
        print(f"Warehouse: {config['defaults'].get('warehouse', 'Not specified')}")
        print(f"S3 Endpoint: {config['defaults'].get('s3.endpoint', 'Not configured')}")
        print(f"Available endpoints: {len(config.get('endpoints', []))} endpoints")
    else:
        print(f"❌ REST Catalog error: {response.status_code}")
except Exception as e:
    print(f"❌ Connection failed: {e}")

# Test MinIO connection
print("\n🗄️ Testing MinIO S3 connection...")
try:
    response = requests.get('http://minio:9000/minio/health/live')
    if response.status_code == 200:
        print("✅ MinIO S3 storage is accessible!")
    else:
        print(f"❌ MinIO error: {response.status_code}")
except Exception as e:
    print(f"❌ MinIO connection failed: {e}")
```

### Cell 2: Create Spark Session

```python
# Create Spark session with Iceberg, REST Catalog, and MinIO S3
spark = SparkSession.builder \
    .appName("Docker Iceberg with MinIO Demo") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://rest-catalog:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "s3://warehouse") \
    .config("spark.sql.defaultCatalog", "rest") \
    .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
    .config("spark.sql.iceberg.vectorization.enabled", "true") \
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000") \
    .config("spark.hadoop.fs.s3a.access.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.secret.key", "minioadmin") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false") \
    .getOrCreate()

# Set log level to reduce noise
spark.sparkContext.setLogLevel("WARN")

print("✅ Spark session created successfully!")
print(f"Spark version: {spark.version}")
print(f"Default catalog: {spark.conf.get('spark.sql.defaultCatalog')}")
print(f"Warehouse: {spark.conf.get('spark.sql.catalog.rest.warehouse')}")

# Test basic SQL
spark.sql("SHOW CATALOGS").show()

# Verify S3 connectivity
print("\n🔍 Testing S3 warehouse connectivity...")
try:
    # This will test if we can connect to the S3 warehouse
    spark.sql("SHOW NAMESPACES IN rest").show()
    print("✅ S3 warehouse is accessible!")
except Exception as e:
    print(f"❌ S3 warehouse connection issue: {e}")
```

## Example 2: Creating and Managing Namespaces

### Cell 1: Create Namespaces

```python
print("📁 Creating namespaces...")

# Create different types of namespaces
namespaces_to_create = [
    "retail",
    "analytics", 
    "finance.quarterly",
    "logs.application"
]

for ns in namespaces_to_create:
    try:
        spark.sql(f"CREATE NAMESPACE IF NOT EXISTS rest.{ns}")
        print(f"✅ Created namespace: {ns}")
    except Exception as e:
        print(f"❌ Error creating {ns}: {e}")

print("\n📋 All namespaces:")
spark.sql("SHOW NAMESPACES IN rest").show(truncate=False)
```

### Cell 2: Namespace Properties

```python
# Add properties to namespaces (requires REST API call since Spark SQL doesn't support this directly)
namespace_properties = {
    "retail": {"owner": "retail-team", "environment": "development"},
    "analytics": {"owner": "data-team", "retention": "5-years"},
    "finance": {"owner": "finance-team", "security-level": "high"}
}

for ns, props in namespace_properties.items():
    try:
        # Use requests to set namespace properties via REST API
        url = f"http://rest-catalog:3000/v1/catalog/namespaces/{ns}/properties"
        payload = {"updates": props}
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print(f"✅ Updated properties for {ns}")
        else:
            print(f"❌ Failed to update {ns}: {response.text}")
    except Exception as e:
        print(f"❌ Error updating {ns}: {e}")
```

## Example 3: Creating Tables with Different Schemas

### Cell 1: E-commerce Sales Table

```python
print("🛒 Creating e-commerce sales table...")

# Create sales table with partitioning
spark.sql("""
CREATE TABLE IF NOT EXISTS rest.retail.sales (
    sale_id BIGINT,
    customer_id STRING,
    product_name STRING,
    category STRING,
    price DECIMAL(10,2),
    quantity INT,
    discount_percent DECIMAL(5,2),
    sale_timestamp TIMESTAMP,
    region STRING,
    payment_method STRING
) USING ICEBERG
PARTITIONED BY (region, days(sale_timestamp))
TBLPROPERTIES (
    'format-version' = '2',
    'write.target-file-size-bytes' = '134217728'
)
""")

print("✅ Sales table created!")

# Show table schema
print("\n📋 Table schema:")
spark.sql("DESCRIBE rest.retail.sales").show(truncate=False)
```

### Cell 2: Time Series IoT Data Table

```python
print("📊 Creating IoT sensor data table...")

spark.sql("""
CREATE TABLE IF NOT EXISTS rest.analytics.sensor_readings (
    sensor_id STRING,
    device_type STRING,
    timestamp TIMESTAMP,
    temperature DOUBLE,
    humidity DOUBLE,
    pressure DOUBLE,
    battery_level INT,
    location STRUCT<latitude: DOUBLE, longitude: DOUBLE>,
    metadata MAP<STRING, STRING>
) USING ICEBERG
PARTITIONED BY (device_type, hours(timestamp))
TBLPROPERTIES (
    'format-version' = '2',
    'write.parquet.compression-codec' = 'snappy'
)
""")

print("✅ IoT sensor table created!")

# Show partitioning information
spark.sql("DESCRIBE EXTENDED rest.analytics.sensor_readings").show(truncate=False)
```

### Cell 3: Financial Transactions Table

```python
print("💰 Creating financial transactions table...")

spark.sql("""
CREATE TABLE IF NOT EXISTS rest.finance.transactions (
    transaction_id STRING,
    account_id STRING,
    transaction_type STRING,
    amount DECIMAL(15,2),
    currency STRING,
    transaction_date DATE,
    description STRING,
    merchant_category STRING,
    is_fraudulent BOOLEAN,
    risk_score DOUBLE
) USING ICEBERG
PARTITIONED BY (currency, transaction_type, bucket(20, account_id))
TBLPROPERTIES (
    'format-version' = '2',
    'write.distribution-mode' = 'hash'
)
""")

print("✅ Transactions table created!")

# List all tables
print("\n📋 All tables:")
for namespace in ["retail", "analytics", "finance"]:
    print(f"\n{namespace.upper()} tables:")
    spark.sql(f"SHOW TABLES IN rest.{namespace}").show()
```

## Example 4: Inserting Sample Data

### Cell 1: Generate Sales Data

```python
from datetime import datetime, timedelta
import random

print("📝 Inserting sample sales data...")

# Generate sample sales data
sales_data = []
regions = ["North", "South", "East", "West", "Central"]
categories = ["Electronics", "Clothing", "Home", "Books", "Sports"]
payment_methods = ["Credit Card", "Debit Card", "PayPal", "Cash"]

start_date = datetime(2024, 1, 1)

for i in range(1000):
    sale_date = start_date + timedelta(days=random.randint(0, 90))
    sales_data.append((
        i + 1,  # sale_id
        f"CUST_{random.randint(1000, 9999)}",  # customer_id
        f"Product {random.randint(1, 100)}",   # product_name
        random.choice(categories),             # category
        round(random.uniform(10.99, 999.99), 2),  # price
        random.randint(1, 5),                 # quantity
        round(random.uniform(0, 25), 2),      # discount_percent
        sale_date,                            # sale_timestamp
        random.choice(regions),               # region
        random.choice(payment_methods)        # payment_method
    ))

# Create DataFrame and insert
sales_df = spark.createDataFrame(sales_data, [
    "sale_id", "customer_id", "product_name", "category", "price", 
    "quantity", "discount_percent", "sale_timestamp", "region", "payment_method"
])

# Insert data
sales_df.writeTo("rest.retail.sales").append()

print(f"✅ Inserted {len(sales_data)} sales records!")
```

### Cell 2: Generate IoT Sensor Data

```python
print("📡 Inserting IoT sensor data...")

# Generate IoT sensor data
sensor_data = []
device_types = ["temperature", "humidity", "pressure", "multi-sensor"]
locations = [
    {"latitude": 37.7749, "longitude": -122.4194},  # San Francisco
    {"latitude": 40.7128, "longitude": -74.0060},   # New York
    {"latitude": 34.0522, "longitude": -118.2437},  # Los Angeles
]

start_time = datetime(2024, 1, 1)

for i in range(500):
    sensor_time = start_time + timedelta(minutes=random.randint(0, 43200))  # 30 days
    location = random.choice(locations)
    
    sensor_data.append((
        f"SENSOR_{random.randint(1000, 9999)}",
        random.choice(device_types),
        sensor_time,
        round(random.uniform(15.0, 35.0), 2),  # temperature
        round(random.uniform(30.0, 80.0), 2),  # humidity
        round(random.uniform(980.0, 1020.0), 2),  # pressure
        random.randint(10, 100),  # battery_level
        location,  # location struct
        {"firmware": f"v{random.randint(1,5)}.{random.randint(0,9)}", "model": f"MODEL-{random.randint(100,999)}"}  # metadata
    ))

# Create DataFrame
sensor_df = spark.createDataFrame(sensor_data, [
    "sensor_id", "device_type", "timestamp", "temperature", "humidity", 
    "pressure", "battery_level", "location", "metadata"
])

# Insert data
sensor_df.writeTo("rest.analytics.sensor_readings").append()

print(f"✅ Inserted {len(sensor_data)} sensor readings!")
```

### Cell 3: Generate Financial Data

```python
print("💳 Inserting financial transaction data...")

# Generate financial transaction data
transaction_data = []
currencies = ["USD", "EUR", "GBP", "JPY"]
transaction_types = ["DEBIT", "CREDIT", "TRANSFER", "PAYMENT"]
merchant_categories = ["GROCERY", "GAS", "RESTAURANT", "RETAIL", "ONLINE", "ATM"]

start_date = date(2024, 1, 1)

for i in range(2000):
    trans_date = start_date + timedelta(days=random.randint(0, 90))
    is_fraud = random.random() < 0.02  # 2% fraud rate
    
    transaction_data.append((
        f"TXN_{i+1:08d}",
        f"ACC_{random.randint(100000, 999999)}",
        random.choice(transaction_types),
        round(random.uniform(5.00, 5000.00) * (-1 if random.choice(transaction_types) == "DEBIT" else 1), 2),
        random.choice(currencies),
        trans_date,
        f"Transaction {i+1}",
        random.choice(merchant_categories),
        is_fraud,
        round(random.uniform(0.1, 0.9) if not is_fraud else random.uniform(0.7, 1.0), 3)
    ))

# Create DataFrame
trans_df = spark.createDataFrame(transaction_data, [
    "transaction_id", "account_id", "transaction_type", "amount", "currency",
    "transaction_date", "description", "merchant_category", "is_fraudulent", "risk_score"
])

# Insert data
trans_df.writeTo("rest.finance.transactions").append()

print(f"✅ Inserted {len(transaction_data)} transactions!")
```

## Example 5: Advanced Queries and Analytics

### Cell 1: Sales Analytics

```python
print("📈 Running sales analytics...")

# Sales by region and category
print("🌎 Sales by region and category:")
spark.sql("""
SELECT region, category,
       COUNT(*) as total_sales,
       SUM(price * quantity) as total_revenue,
       AVG(price * quantity) as avg_sale_value,
       SUM(quantity) as total_quantity
FROM rest.retail.sales
GROUP BY region, category
ORDER BY total_revenue DESC
""").show()

# Top customers by spending
print("\n👑 Top 10 customers by spending:")
spark.sql("""
SELECT customer_id,
       COUNT(*) as purchase_count,
       SUM(price * quantity * (1 - discount_percent/100)) as total_spent,
       AVG(price * quantity * (1 - discount_percent/100)) as avg_purchase
FROM rest.retail.sales
GROUP BY customer_id
ORDER BY total_spent DESC
LIMIT 10
""").show()

# Daily sales trends
print("\n📅 Daily sales trends:")
spark.sql("""
SELECT DATE(sale_timestamp) as sale_date,
       COUNT(*) as daily_sales,
       SUM(price * quantity * (1 - discount_percent/100)) as daily_revenue
FROM rest.retail.sales
GROUP BY DATE(sale_timestamp)
ORDER BY sale_date
""").show()
```

### Cell 2: IoT Sensor Analytics

```python
print("🌡️ IoT sensor analytics...")

# Average readings by device type
print("📊 Average readings by device type:")
spark.sql("""
SELECT device_type,
       COUNT(*) as reading_count,
       AVG(temperature) as avg_temperature,
       AVG(humidity) as avg_humidity,
       AVG(pressure) as avg_pressure,
       AVG(battery_level) as avg_battery
FROM rest.analytics.sensor_readings
GROUP BY device_type
ORDER BY reading_count DESC
""").show()

# Sensors with low battery
print("\n🔋 Sensors with low battery (< 20%):")
spark.sql("""
SELECT sensor_id, device_type, 
       AVG(battery_level) as avg_battery_level,
       COUNT(*) as reading_count
FROM rest.analytics.sensor_readings
GROUP BY sensor_id, device_type
HAVING AVG(battery_level) < 20
ORDER BY avg_battery_level
""").show()

# Temperature anomalies
print("\n🌡️ Temperature anomalies (outside normal range):")
spark.sql("""
SELECT sensor_id, device_type, timestamp,
       temperature,
       CASE 
         WHEN temperature < 0 OR temperature > 50 THEN 'EXTREME'
         WHEN temperature < 10 OR temperature > 40 THEN 'WARNING'
         ELSE 'NORMAL'
       END as alert_level
FROM rest.analytics.sensor_readings
WHERE temperature < 10 OR temperature > 40
ORDER BY timestamp DESC
LIMIT 20
""").show()
```

### Cell 3: Financial Analytics

```python
print("💰 Financial transaction analytics...")

# Transaction summary by type and currency
print("💱 Transaction summary by type and currency:")
spark.sql("""
SELECT transaction_type, currency,
       COUNT(*) as transaction_count,
       SUM(amount) as total_amount,
       AVG(amount) as avg_amount,
       MIN(amount) as min_amount,
       MAX(amount) as max_amount
FROM rest.finance.transactions
GROUP BY transaction_type, currency
ORDER BY transaction_type, currency
""").show()

# Fraud detection analysis
print("\n🚨 Fraud analysis:")
spark.sql("""
SELECT merchant_category,
       COUNT(*) as total_transactions,
       SUM(CAST(is_fraudulent as INT)) as fraudulent_count,
       ROUND(SUM(CAST(is_fraudulent as INT)) * 100.0 / COUNT(*), 2) as fraud_rate,
       AVG(risk_score) as avg_risk_score
FROM rest.finance.transactions
GROUP BY merchant_category
ORDER BY fraud_rate DESC
""").show()

# High-risk transactions
print("\n⚠️ High-risk transactions (risk score > 0.8):")
spark.sql("""
SELECT transaction_id, account_id, transaction_type, amount, currency,
       merchant_category, risk_score, is_fraudulent
FROM rest.finance.transactions
WHERE risk_score > 0.8
ORDER BY risk_score DESC
LIMIT 20
""").show()
```

## Example 6: Iceberg-Specific Features

### Cell 1: Time Travel Queries

```python
print("⏰ Demonstrating time travel queries...")

# Show table history
print("📜 Table history for sales:")
spark.sql("SELECT * FROM rest.retail.sales.history").show(truncate=False)

# Show snapshots
print("\n📸 Table snapshots:")
spark.sql("SELECT snapshot_id, committed_at, summary FROM rest.retail.sales.snapshots").show(truncate=False)

# Query table at specific snapshot (use actual snapshot ID from above)
snapshots = spark.sql("SELECT snapshot_id FROM rest.retail.sales.snapshots ORDER BY committed_at LIMIT 1").collect()
if snapshots:
    snapshot_id = snapshots[0]['snapshot_id']
    print(f"\n🕰️ Querying data at snapshot {snapshot_id}:")
    spark.sql(f"""
    SELECT COUNT(*) as record_count, 
           MIN(sale_timestamp) as earliest_sale,
           MAX(sale_timestamp) as latest_sale
    FROM rest.retail.sales FOR SYSTEM_VERSION AS OF {snapshot_id}
    """).show()
```

### Cell 2: Schema Evolution

```python
print("🔄 Demonstrating schema evolution...")

# Add a new column
print("➕ Adding customer_email column...")
spark.sql("ALTER TABLE rest.retail.sales ADD COLUMN customer_email STRING")

# Show updated schema
print("\n📋 Updated schema:")
spark.sql("DESCRIBE rest.retail.sales").show(truncate=False)

# Insert data with new column
print("\n📝 Inserting data with new column...")
spark.sql("""
INSERT INTO rest.retail.sales VALUES 
(9999, 'CUST_NEW', 'Test Product', 'Electronics', 199.99, 1, 0.0, 
 TIMESTAMP('2024-03-01 12:00:00'), 'North', 'Credit Card', 'customer@example.com')
""")

# Query data including new column
spark.sql("""
SELECT sale_id, customer_id, product_name, customer_email 
FROM rest.retail.sales 
WHERE customer_email IS NOT NULL
""").show()

# Rename a column
print("\n🏷️ Renaming discount_percent to discount_rate...")
spark.sql("ALTER TABLE rest.retail.sales RENAME COLUMN discount_percent TO discount_rate")

print("✅ Schema evolution completed!")
```

### Cell 3: Partitioning and File Management

```python
print("📁 Exploring partitioning and file management...")

# Show table files
print("📄 Table files:")
files_df = spark.sql("SELECT file_path, file_format, record_count, file_size_in_bytes FROM rest.retail.sales.files")
files_df.show(truncate=False)

print(f"\n📊 File statistics:")
files_df.agg(
    count("*").alias("total_files"),
    sum("record_count").alias("total_records"),
    sum("file_size_in_bytes").alias("total_size_bytes")
).show()

# Show partition information
print("\n📂 Partition information:")
spark.sql("""
SELECT region, 
       COUNT(*) as partition_count
FROM (
  SELECT DISTINCT region, DATE(sale_timestamp) as sale_date
  FROM rest.retail.sales
) 
GROUP BY region
ORDER BY partition_count DESC
""").show()

# Compact small files (if any)
print("\n🗜️ Table maintenance operations available:")
print("- REWRITE DATA: Compact small files")
print("- REWRITE MANIFESTS: Optimize manifest files")
print("- EXPIRE SNAPSHOTS: Remove old snapshots")
```

## Example 7: Views and Complex Queries

### Cell 1: Create Views

```python
print("👁️ Creating views for common queries...")

# Sales summary view
spark.sql("""
CREATE OR REPLACE VIEW rest.retail.sales_summary AS
SELECT 
    region,
    category,
    DATE(sale_timestamp) as sale_date,
    COUNT(*) as daily_sales,
    SUM(price * quantity * (1 - discount_rate/100)) as daily_revenue,
    AVG(price * quantity * (1 - discount_rate/100)) as avg_sale_value
FROM rest.retail.sales
GROUP BY region, category, DATE(sale_timestamp)
""")

# Customer analytics view
spark.sql("""
CREATE OR REPLACE VIEW rest.retail.customer_analytics AS
SELECT 
    customer_id,
    COUNT(*) as total_purchases,
    SUM(price * quantity * (1 - discount_rate/100)) as lifetime_value,
    AVG(price * quantity * (1 - discount_rate/100)) as avg_purchase_value,
    COUNT(DISTINCT category) as categories_purchased,
    MIN(sale_timestamp) as first_purchase,
    MAX(sale_timestamp) as last_purchase,
    DATEDIFF(MAX(sale_timestamp), MIN(sale_timestamp)) as customer_tenure_days
FROM rest.retail.sales
GROUP BY customer_id
""")

# Fraud detection view
spark.sql("""
CREATE OR REPLACE VIEW rest.finance.fraud_monitoring AS
SELECT 
    account_id,
    DATE(transaction_date) as trans_date,
    COUNT(*) as daily_transactions,
    SUM(CASE WHEN is_fraudulent THEN 1 ELSE 0 END) as fraudulent_transactions,
    AVG(risk_score) as avg_daily_risk_score,
    SUM(ABS(amount)) as daily_transaction_volume,
    COUNT(DISTINCT merchant_category) as unique_merchants
FROM rest.finance.transactions
GROUP BY account_id, DATE(transaction_date)
""")

print("✅ Views created!")

# Show views
print("\n📋 Available views:")
for namespace in ["retail", "finance"]:
    print(f"\n{namespace.upper()} views:")
    spark.sql(f"SHOW VIEWS IN rest.{namespace}").show()
```

### Cell 2: Query Views

```python
print("🔍 Querying views...")

# Top performing regions
print("🏆 Top performing regions (last 30 days):")
spark.sql("""
SELECT region,
       SUM(daily_sales) as total_sales,
       SUM(daily_revenue) as total_revenue,
       AVG(avg_sale_value) as avg_sale_value
FROM rest.retail.sales_summary
WHERE sale_date >= DATE_SUB(CURRENT_DATE(), 30)
GROUP BY region
ORDER BY total_revenue DESC
""").show()

# Customer segmentation
print("\n👥 Customer segmentation:")
spark.sql("""
SELECT 
    CASE 
        WHEN lifetime_value >= 1000 THEN 'High Value'
        WHEN lifetime_value >= 500 THEN 'Medium Value'
        ELSE 'Low Value'
    END as customer_segment,
    COUNT(*) as customer_count,
    AVG(lifetime_value) as avg_lifetime_value,
    AVG(total_purchases) as avg_purchases,
    AVG(customer_tenure_days) as avg_tenure_days
FROM rest.retail.customer_analytics
GROUP BY 
    CASE 
        WHEN lifetime_value >= 1000 THEN 'High Value'
        WHEN lifetime_value >= 500 THEN 'Medium Value'
        ELSE 'Low Value'
    END
ORDER BY avg_lifetime_value DESC
""").show()

# Fraud monitoring alerts
print("\n🚨 High-risk accounts (multiple fraud indicators):")
spark.sql("""
SELECT account_id,
       COUNT(*) as high_risk_days,
       AVG(avg_daily_risk_score) as overall_risk_score,
       SUM(fraudulent_transactions) as total_fraud_transactions,
       SUM(daily_transaction_volume) as total_volume
FROM rest.finance.fraud_monitoring
WHERE avg_daily_risk_score > 0.7 OR fraudulent_transactions > 0
GROUP BY account_id
HAVING COUNT(*) > 1
ORDER BY overall_risk_score DESC
LIMIT 10
""").show()
```

## Example 8: Performance Optimization

### Cell 1: Query Performance Analysis

```python
print("⚡ Query performance analysis...")

# Enable query execution time tracking
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")

import time

# Time a complex query
start_time = time.time()

result = spark.sql("""
SELECT 
    s.region,
    s.category,
    DATE_TRUNC('month', s.sale_timestamp) as month,
    COUNT(*) as sales_count,
    SUM(s.price * s.quantity) as gross_revenue,
    AVG(s.price * s.quantity) as avg_sale_value,
    COUNT(DISTINCT s.customer_id) as unique_customers
FROM rest.retail.sales s
WHERE s.sale_timestamp >= DATE_SUB(CURRENT_DATE(), 90)
GROUP BY s.region, s.category, DATE_TRUNC('month', s.sale_timestamp)
ORDER BY gross_revenue DESC
""")

result.show()

end_time = time.time()
print(f"\n⏱️ Query execution time: {end_time - start_time:.2f} seconds")

# Show query plan
print("\n📋 Query execution plan:")
result.explain()
```

### Cell 2: Storage Optimization

```python
print("💾 Storage optimization techniques...")

# Show current file sizes and count
print("📊 Current file statistics:")
files_stats = spark.sql("""
SELECT 
    COUNT(*) as file_count,
    SUM(record_count) as total_records,
    AVG(record_count) as avg_records_per_file,
    SUM(file_size_in_bytes) / 1024 / 1024 as total_size_mb,
    AVG(file_size_in_bytes) / 1024 / 1024 as avg_file_size_mb
FROM rest.retail.sales.files
""")
files_stats.show()

# Recommend optimizations
files_data = files_stats.collect()[0]
if files_data['avg_file_size_mb'] < 100:  # Less than 100MB average
    print("💡 Recommendation: Consider compacting small files")
    print("   Use: CALL catalog.system.rewrite_data_files('rest.retail.sales')")

if files_data['file_count'] > 50:
    print("💡 Recommendation: Consider reducing file count through larger target file sizes")
    print("   Set: spark.sql.iceberg.target-file-size-bytes to a larger value")

# Show partition distribution
print("\n📂 Partition distribution:")
spark.sql("""
SELECT region,
       COUNT(DISTINCT DATE(sale_timestamp)) as date_partitions,
       COUNT(*) as total_records
FROM rest.retail.sales
GROUP BY region
ORDER BY total_records DESC
""").show()
```

## Example 9: Cleanup and Maintenance

### Cell 1: Clean Up Resources

```python
print("🧹 Cleaning up resources...")

# Stop Spark session
if 'spark' in locals():
    spark.stop()
    print("✅ Spark session stopped")

# Verify cleanup
print("✅ Notebook cleanup completed!")
print("\n📋 Summary of what was created:")
print("- 3 namespaces: retail, analytics, finance")
print("- 3 tables with sample data")
print("- 3 views for analytics")
print("- Demonstrated Iceberg features: time travel, schema evolution")
print("- Performance analysis and optimization recommendations")
```

## Next Steps

After running through these examples, you can:

1. **Explore the REST Catalog UI** at http://localhost:3000
2. **Create your own tables** with different schemas
3. **Experiment with different partition strategies**
4. **Try advanced Iceberg features** like branching and tagging
5. **Connect external BI tools** to your Iceberg tables
6. **Scale up with external storage** (S3, HDFS, etc.)

## Tips for Development

- **Save notebooks regularly** - they're persisted in the `spark_notebooks` volume
- **Monitor resource usage** with `docker stats`
- **Check Spark UI** at http://localhost:4040 during job execution
- **Use the catalog UI** for quick table browsing and metadata inspection
- **Experiment with different configurations** by modifying the `.env` file

Happy analyzing! 📊✨