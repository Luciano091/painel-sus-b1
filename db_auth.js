const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.AUTH_DB_USER,
  host: process.env.AUTH_DB_HOST,
  database: process.env.AUTH_DB_NAME,
  password: process.env.AUTH_DB_PASS,
  port: process.env.AUTH_DB_PORT,
});

module.exports = pool;