# REST Catalog Server

ExpressJS implementation of the Apache Iceberg REST Catalog API specification.

## Features

- Full implementation of Iceberg REST Catalog API v1
- **Web-based Management UI** - Easy-to-use interface for catalog management
- Support for multiple database backends:
  - In-memory (default)
  - SQLite
  - PostgreSQL
- Namespace management
- Table operations (CRUD, rename)
- View operations (CRUD, rename)
- Transaction support
- No authentication required
- **Complete PySpark integration guide**

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

Environment variables:
- `DB_TYPE`: Database type (`memory`, `sqlite`, `postgres`)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (`development`, `production`)

For PostgreSQL:
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port

For SQLite:
- `DB_PATH`: Path to SQLite database file

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on port 3000 (or your configured PORT). You can access:
- **Management UI**: http://localhost:3000
- **REST API**: http://localhost:3000/v1/*

## Management UI

The server includes a web-based management interface that allows you to:

- **View and manage namespaces**: Create, delete, and view namespace properties
- **Manage tables**: Create tables with custom schemas, view table details, delete tables
- **Rename tables**: Move tables between namespaces or rename them
- **Manage views**: Create and manage SQL views
- **Real-time updates**: See changes immediately in the UI

### Using the UI

1. Open your browser to http://localhost:3000
2. Navigate between Namespaces, Tables, and Views using the sidebar
3. Use the forms to create new resources
4. Click action buttons to delete or rename existing resources
5. View detailed metadata by clicking "Details" buttons

The UI provides:
- **Responsive design** that works on desktop and mobile
- **Form validation** with helpful error messages
- **Sample schema generator** for quick table creation
- **Real-time feedback** with success/error notifications

## PySpark Integration

For detailed instructions on using this REST Catalog server with PySpark and Apache Iceberg, see:

**📖 [PySpark Setup Guide](PYSPARK_SETUP.md)**

The guide includes:
- Complete installation instructions
- Configuration examples for different storage backends (local, S3)
- Working code examples
- Best practices and troubleshooting
- Performance optimization tips

## API Endpoints

The server implements the following REST endpoints:

### Configuration
- `GET /v1/config` - Get catalog configuration

### Namespaces
- `GET /v1/{prefix}/namespaces` - List namespaces
- `POST /v1/{prefix}/namespaces` - Create namespace
- `GET /v1/{prefix}/namespaces/{namespace}` - Get namespace
- `DELETE /v1/{prefix}/namespaces/{namespace}` - Delete namespace
- `POST /v1/{prefix}/namespaces/{namespace}/properties` - Update namespace properties

### Tables
- `GET /v1/{prefix}/namespaces/{namespace}/tables` - List tables in namespace
- `POST /v1/{prefix}/namespaces/{namespace}/tables` - Create table
- `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}` - Get table metadata
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}` - Update table
- `DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}` - Delete table
- `POST /v1/{prefix}/tables/rename` - Rename table
- `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/metrics` - Report table metrics

### Views
- `GET /v1/{prefix}/namespaces/{namespace}/views` - List views in namespace
- `POST /v1/{prefix}/namespaces/{namespace}/views` - Create view
- `GET /v1/{prefix}/namespaces/{namespace}/views/{view}` - Get view metadata
- `POST /v1/{prefix}/namespaces/{namespace}/views/{view}` - Update view
- `DELETE /v1/{prefix}/namespaces/{namespace}/views/{view}` - Delete view
- `POST /v1/{prefix}/views/rename` - Rename view

### Transactions
- `POST /v1/{prefix}/transactions/commit` - Commit transaction

## Project Structure

```
rest-catalog/
├── app.js                    # Main application entry point
├── config/
│   └── database.js           # Database configuration
├── controllers/              # Request handlers
│   ├── configController.js
│   ├── namespaceController.js
│   ├── tableController.js
│   ├── viewController.js
│   └── transactionController.js
├── models/                   # Database models
│   ├── index.js
│   ├── Namespace.js
│   ├── Table.js
│   └── View.js
├── routes/                   # Route definitions
│   ├── config.js
│   ├── namespaces.js
│   ├── tables.js
│   ├── views.js
│   └── transactions.js
├── public/                   # Web UI assets
│   ├── index.html           # Main UI page
│   ├── css/
│   │   └── style.css        # UI styles
│   └── js/
│       └── app.js           # UI JavaScript
├── package.json
├── .env.example
├── README.md
└── PYSPARK_SETUP.md         # PySpark integration guide
```

## Screenshots

The management UI provides an intuitive interface for catalog operations:

### Namespaces Management
- Create namespaces with custom properties
- View existing namespaces and their metadata
- Delete namespaces with confirmation

### Tables Management  
- Create tables with JSON schema definitions
- Sample schema generator for quick setup
- View table metadata and structure
- Rename/move tables between namespaces
- Delete tables with confirmation

### Views Management
- Create SQL views with custom queries
- Manage view lifecycle
- View metadata inspection

## License

Apache 2.0