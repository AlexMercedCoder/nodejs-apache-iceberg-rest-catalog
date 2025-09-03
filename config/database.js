const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'memory';

let sequelize;

switch (dbType) {
  case 'postgres':
    sequelize = new Sequelize(
      process.env.DB_NAME || 'catalog',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'password',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV !== 'production' ? console.log : false,
      }
    );
    break;
  
  case 'sqlite':
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_PATH || './catalog.db',
      logging: process.env.NODE_ENV !== 'production' ? console.log : false,
    });
    break;
  
  case 'memory':
  default:
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: process.env.NODE_ENV !== 'production' ? console.log : false,
    });
    break;
}

module.exports = sequelize;