require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Log de Diagnóstico para verificar a conexão imediatamente
pool.query('SELECT current_database()', (err, res) => {
    if (err) {
        console.error('❌ ERRO FATAL na conexão com Banco Principal:', err.message);
    } else {
        console.log('✅ CONEXÃO PRINCIPAL ESTABELECIDA. Banco Atual:', res.rows[0].current_database);
    }
});

module.exports = pool;