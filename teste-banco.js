// teste-banco.js
require('dotenv').config();
const { Pool } = require('pg');

console.log('--- Iniciando teste de conexão... ---');
console.log(`Tentando conectar em: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`Usuário: ${process.env.DB_USER}`);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERRO AO CONECTAR:', err);
  } else {
    console.log('✅ SUCESSO! Conectado em:', res.rows[0].now);
  }
  pool.end(); // Fecha a conexão
});