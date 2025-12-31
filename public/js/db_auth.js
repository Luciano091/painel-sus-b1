const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com o banco de Autenticação (Leitura e Escrita)
const authPool = new Pool({
    host: process.env.AUTH_DB_HOST,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASS,
    database: process.env.AUTH_DB_NAME,
    port: process.env.AUTH_DB_PORT || 5432,
});

authPool.on('error', (err) => {
    console.error('Erro inesperado no cliente do banco de autenticação (Idle Client)', err);
    process.exit(-1);
});

module.exports = authPool;