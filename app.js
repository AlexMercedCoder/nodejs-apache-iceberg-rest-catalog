const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const sequelize = require('./config/database');
require('dotenv').config();

const configRoutes = require('./routes/config');
const namespaceRoutes = require('./routes/namespaces');
const tableRoutes = require('./routes/tables');
const viewRoutes = require('./routes/views');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Serve static files for UI
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/v1/config', configRoutes);
app.use('/v1', namespaceRoutes);
app.use('/v1', tableRoutes);
app.use('/v1', viewRoutes);
app.use('/v1', transactionRoutes);

// Serve UI on root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    type: 'InternalServerException',
    code: 500
  });
});

// Handle API 404s vs UI routes
app.use('/v1/*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found',
    type: 'NoSuchEndpointException',
    code: 404
  });
});

// Catch-all for UI routes - serve index.html for client-side routing
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync({ force: false });
    console.log('Database synchronized.');
    
    app.listen(PORT, () => {
      console.log(`REST Catalog server listening on port ${PORT}`);
      console.log(`Database type: ${process.env.DB_TYPE || 'memory'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();