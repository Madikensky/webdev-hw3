const { DataSource } = require('typeorm');
const { types } = require('pg');

types.setTypeParser(types.builtins.DATE, (value) => value);

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'site_tracker',
  entities: [
    require('./entities/City'),
    require('./entities/Site'),
    require('./entities/Equipment'),
    require('./entities/Inspection'),
  ],

  synchronize: false,
  migrations: [`${__dirname}/migrations/*.js`],
  logging: process.env.DB_LOGGING === 'true',
});

module.exports = { AppDataSource };
