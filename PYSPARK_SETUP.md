# Using REST Catalog Server with PySpark and Apache Iceberg

This guide walks you through setting up and using the REST Catalog server with PySpark and Apache Iceberg.

## Prerequisites

- Python 3.7+
- Java 8 or 11
- Apache Spark 3.3+ (recommended)
- REST Catalog server running

## Installation

### 1. Install PySpark and Dependencies

```bash
pip install pyspark==3.5.0
pip install pyiceberg[pyarrow,s3fs]  # Optional: for additional features
```

### 2. Download Required JAR Files

Download the following JAR files and place them in your Spark jars directory or specify them when creating the SparkSession:

```bash
# Create a jars directory
mkdir -p ~/spark-jars

# Download Iceberg Spark runtime (adjust version as needed)
wget -O ~/spark-jars/iceberg-spark-runtime-3.5_2.12-1.4.2.jar \
  https://repo1.maven.org/maven2/org/apache/iceberg/iceberg-spark-runtime-3.5_2.12/1.4.2/iceberg-spark-runtime-3.5_2.12-1.4.2.jar

# Download AWS SDK bundle (if using S3)
wget -O ~/spark-jars/bundle-2.20.18.jar \
  https://repo1.maven.org/maven2/software/amazon/awssdk/bundle/2.20.18/bundle-2.20.18.jar

# Download URL connection client (if using S3)
wget -O ~/spark-jars/url-connection-client-2.20.18.jar \
  https://repo1.maven.org/maven2/software/amazon/awssdk/url-connection-client/2.20.18/url-connection-client-2.20.18.jar
```

## Configuration

### 1. Start the REST Catalog Server

Make sure your REST Catalog server is running:

```bash
# In the rest-catalog directory
npm install
npm start
```

The server should be available at `http://localhost:3000`.

### 2. Configure PySpark Session

Create a PySpark session with Iceberg and REST Catalog configuration:

```python
from pyspark.sql import SparkSession
import os

# Path to your downloaded JAR files
jar_path = os.path.expanduser("~/spark-jars")
iceberg_jars = f"{jar_path}/iceberg-spark-runtime-3.5_2.12-1.4.2.jar"

# Optional: Add AWS jars if using S3 storage
aws_jars = f"{jar_path}/bundle-2.20.18.jar,{jar_path}/url-connection-client-2.20.18.jar"

# Create Spark session
spark = SparkSession.builder \
    .appName("Iceberg REST Catalog Demo") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://localhost:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "file:///tmp/warehouse") \
    .config("spark.jars", iceberg_jars) \
    .config("spark.sql.defaultCatalog", "rest") \
    .getOrCreate()

# Set log level to reduce noise
spark.sparkContext.setLogLevel("WARN")

print("Spark session created successfully!")
print(f"Spark version: {spark.version}")
```

### 3. Alternative Configuration for Different Storage Backends

#### For S3 Storage:

```python
spark = SparkSession.builder \
    .appName("Iceberg REST Catalog with S3") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://localhost:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "s3a://your-bucket/warehouse/") \
    .config("spark.sql.catalog.rest.s3.endpoint", "https://s3.amazonaws.com") \
    .config("spark.hadoop.fs.s3a.access.key", "your-access-key") \
    .config("spark.hadoop.fs.s3a.secret.key", "your-secret-key") \
    .config("spark.jars", f"{iceberg_jars},{aws_jars}") \
    .config("spark.sql.defaultCatalog", "rest") \
    .getOrCreate()
```

#### For Local File System:

```python
spark = SparkSession.builder \
    .appName("Iceberg REST Catalog Local") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest.type", "rest") \
    .config("spark.sql.catalog.rest.uri", "http://localhost:3000/v1") \
    .config("spark.sql.catalog.rest.warehouse", "file:///tmp/warehouse") \
    .config("spark.jars", iceberg_jars) \
    .config("spark.sql.defaultCatalog", "rest") \
    .getOrCreate()
```

## Usage Examples

### 1. Create Namespaces

```python
# Create a namespace
spark.sql("CREATE NAMESPACE IF NOT EXISTS rest.analytics")
spark.sql("CREATE NAMESPACE IF NOT EXISTS rest.sales.quarterly")

# List namespaces
spark.sql("SHOW NAMESPACES IN rest").show()
```

### 2. Create and Manage Tables

```python
# Create a table
spark.sql("""
CREATE TABLE rest.analytics.sales_data (
    id BIGINT,
    customer_name STRING,
    product_name STRING,
    sale_amount DECIMAL(10,2),
    sale_date DATE,
    region STRING
) USING ICEBERG
PARTITIONED BY (region, bucket(10, id))
""")

# Show tables
spark.sql("SHOW TABLES IN rest.analytics").show()

# Describe table
spark.sql("DESCRIBE rest.analytics.sales_data").show()
```

### 3. Insert and Query Data

```python
# Insert sample data
spark.sql("""
INSERT INTO rest.analytics.sales_data VALUES
    (1, 'John Doe', 'Laptop', 999.99, '2024-01-15', 'North'),
    (2, 'Jane Smith', 'Mouse', 29.99, '2024-01-16', 'South'),
    (3, 'Bob Johnson', 'Keyboard', 79.99, '2024-01-17', 'East'),
    (4, 'Alice Brown', 'Monitor', 299.99, '2024-01-18', 'West'),
    (5, 'Charlie Davis', 'Laptop', 1199.99, '2024-01-19', 'North')
""")

# Query data
result = spark.sql("SELECT * FROM rest.analytics.sales_data")
result.show()

# Query with aggregation
spark.sql("""
SELECT region, COUNT(*) as sales_count, SUM(sale_amount) as total_sales
FROM rest.analytics.sales_data
GROUP BY region
ORDER BY total_sales DESC
""").show()
```

### 4. Table Operations

```python
# Show table metadata
spark.sql("DESCRIBE EXTENDED rest.analytics.sales_data").show(truncate=False)

# Show table history
spark.sql("SELECT * FROM rest.analytics.sales_data.history").show()

# Show table snapshots
spark.sql("SELECT * FROM rest.analytics.sales_data.snapshots").show(truncate=False)

# Show table files
spark.sql("SELECT * FROM rest.analytics.sales_data.files").show(truncate=False)
```

### 5. Schema Evolution

```python
# Add a column
spark.sql("ALTER TABLE rest.analytics.sales_data ADD COLUMN discount_rate DECIMAL(3,2)")

# Rename a column
spark.sql("ALTER TABLE rest.analytics.sales_data RENAME COLUMN customer_name TO client_name")

# Drop a column
spark.sql("ALTER TABLE rest.analytics.sales_data DROP COLUMN discount_rate")
```

### 6. Partitioning Operations

```python
# Create a partitioned table
spark.sql("""
CREATE TABLE rest.analytics.time_series_data (
    timestamp TIMESTAMP,
    sensor_id STRING,
    value DOUBLE,
    location STRING
) USING ICEBERG
PARTITIONED BY (days(timestamp), location)
""")

# Insert data with different partitions
spark.sql("""
INSERT INTO rest.analytics.time_series_data VALUES
    ('2024-01-01 10:00:00', 'sensor_1', 23.5, 'warehouse_a'),
    ('2024-01-01 11:00:00', 'sensor_2', 24.1, 'warehouse_b'),
    ('2024-01-02 09:00:00', 'sensor_1', 22.8, 'warehouse_a'),
    ('2024-01-02 10:00:00', 'sensor_3', 25.3, 'warehouse_c')
""")
```

### 7. Time Travel Queries

```python
# Query table as of a specific timestamp
spark.sql("""
SELECT * FROM rest.analytics.sales_data
FOR SYSTEM_TIME AS OF '2024-01-18'
""").show()

# Query table as of a specific snapshot
spark.sql("""
SELECT * FROM rest.analytics.sales_data
FOR SYSTEM_VERSION AS OF 1
""").show()
```

## Using DataFrames API

You can also work with Iceberg tables using the DataFrame API:

```python
# Read from an Iceberg table
df = spark.read.format("iceberg").load("rest.analytics.sales_data")
df.show()

# Write DataFrame to Iceberg table
data = [
    (6, "David Wilson", "Tablet", 399.99, "2024-01-20", "Central"),
    (7, "Emma Garcia", "Headphones", 149.99, "2024-01-21", "South")
]

columns = ["id", "customer_name", "product_name", "sale_amount", "sale_date", "region"]
new_df = spark.createDataFrame(data, columns)

new_df.writeTo("rest.analytics.sales_data").append()

# Overwrite specific partitions
new_df.writeTo("rest.analytics.sales_data") \
    .option("write.mode", "overwrite") \
    .option("write.distribution-mode", "hash") \
    .append()
```

## Working with Views

```python
# Create a view (this will be stored in the REST catalog)
spark.sql("""
CREATE VIEW rest.analytics.high_value_sales AS
SELECT customer_name, product_name, sale_amount, sale_date
FROM rest.analytics.sales_data
WHERE sale_amount > 500
""")

# Query the view
spark.sql("SELECT * FROM rest.analytics.high_value_sales").show()

# Show views
spark.sql("SHOW VIEWS IN rest.analytics").show()
```

## Best Practices

### 1. Connection Configuration

- Always specify the warehouse location that matches your storage system
- Use connection pooling for production environments
- Set appropriate timeouts for REST calls

### 2. Performance Optimization

```python
# Enable vectorized reads
spark.conf.set("spark.sql.iceberg.vectorization.enabled", "true")

# Optimize merge operations
spark.conf.set("spark.sql.iceberg.merge.cardinality-check.enabled", "false")

# Set appropriate file sizes
spark.conf.set("spark.sql.iceberg.target-file-size-bytes", "134217728")  # 128MB
```

### 3. Monitoring and Debugging

```python
# Enable Iceberg metrics
spark.conf.set("spark.sql.iceberg.metrics-reporter-impl", "org.apache.iceberg.spark.metrics.LoggingMetricsReporter")

# Set appropriate log levels
spark.sparkContext.setLogLevel("INFO")  # For debugging
```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Refused**: Make sure the REST Catalog server is running on the correct port
2. **ClassNotFoundException**: Ensure all required JAR files are in the classpath
3. **Access Denied**: Check warehouse permissions and credentials
4. **Schema Evolution Errors**: Verify that schema changes are compatible

### Verification Steps

```python
# Test the connection
try:
    spark.sql("SHOW NAMESPACES").show()
    print("✅ Connection successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")

# Check catalog configuration
spark.sql("SHOW CATALOGS").show()

# Verify Iceberg extensions are loaded
print("Spark Extensions:", spark.conf.get("spark.sql.extensions"))
```

## Cleanup

```python
# Drop tables
spark.sql("DROP TABLE IF EXISTS rest.analytics.sales_data")
spark.sql("DROP TABLE IF EXISTS rest.analytics.time_series_data")

# Drop views
spark.sql("DROP VIEW IF EXISTS rest.analytics.high_value_sales")

# Drop namespaces
spark.sql("DROP NAMESPACE IF EXISTS rest.analytics CASCADE")

# Stop Spark session
spark.stop()
```

## Additional Resources

- [Apache Iceberg Documentation](https://iceberg.apache.org/)
- [Iceberg Spark Integration](https://iceberg.apache.org/docs/latest/spark-configuration/)
- [PySpark Documentation](https://spark.apache.org/docs/latest/api/python/)
- [REST Catalog Specification](https://iceberg.apache.org/docs/latest/rest/)

## Example Scripts

### Complete Working Example

```python
#!/usr/bin/env python3
"""
Complete example of using REST Catalog with PySpark and Iceberg
"""

from pyspark.sql import SparkSession
import os
from datetime import datetime, date

def create_spark_session():
    """Create and configure Spark session with Iceberg and REST catalog"""
    jar_path = os.path.expanduser("~/spark-jars")
    iceberg_jars = f"{jar_path}/iceberg-spark-runtime-3.5_2.12-1.4.2.jar"
    
    spark = SparkSession.builder \
        .appName("REST Catalog Iceberg Demo") \
        .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
        .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog") \
        .config("spark.sql.catalog.rest.type", "rest") \
        .config("spark.sql.catalog.rest.uri", "http://localhost:3000/v1") \
        .config("spark.sql.catalog.rest.warehouse", "file:///tmp/warehouse") \
        .config("spark.jars", iceberg_jars) \
        .config("spark.sql.defaultCatalog", "rest") \
        .config("spark.sql.iceberg.vectorization.enabled", "true") \
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("WARN")
    return spark

def main():
    spark = create_spark_session()
    
    try:
        # Create namespace
        spark.sql("CREATE NAMESPACE IF NOT EXISTS rest.demo")
        print("✅ Namespace created")
        
        # Create table
        spark.sql("""
        CREATE TABLE IF NOT EXISTS rest.demo.employee_data (
            id BIGINT,
            name STRING,
            department STRING,
            salary DECIMAL(10,2),
            hire_date DATE
        ) USING ICEBERG
        PARTITIONED BY (department)
        """)
        print("✅ Table created")
        
        # Insert data
        employees = [
            (1, "Alice Johnson", "Engineering", 95000.00, date(2022, 1, 15)),
            (2, "Bob Smith", "Marketing", 75000.00, date(2022, 2, 20)),
            (3, "Carol Davis", "Engineering", 88000.00, date(2022, 3, 10)),
            (4, "David Wilson", "Sales", 82000.00, date(2022, 4, 5)),
            (5, "Emma Brown", "Marketing", 79000.00, date(2022, 5, 12))
        ]
        
        df = spark.createDataFrame(employees, ["id", "name", "department", "salary", "hire_date"])
        df.writeTo("rest.demo.employee_data").append()
        print("✅ Data inserted")
        
        # Query data
        result = spark.sql("SELECT * FROM rest.demo.employee_data ORDER BY salary DESC")
        result.show()
        
        # Aggregation query
        dept_stats = spark.sql("""
        SELECT department, 
               COUNT(*) as employee_count,
               AVG(salary) as avg_salary,
               MAX(salary) as max_salary
        FROM rest.demo.employee_data 
        GROUP BY department
        ORDER BY avg_salary DESC
        """)
        dept_stats.show()
        
        print("✅ Demo completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        spark.stop()

if __name__ == "__main__":
    main()
```

Save this as `iceberg_demo.py` and run it with:

```bash
python iceberg_demo.py
```

This completes the PySpark setup and usage guide for the REST Catalog server.