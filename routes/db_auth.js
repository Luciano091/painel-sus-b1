const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com o banco de Autenticação
const authPool = new Pool({
    user: process.env.AUTH_DB_USER,
    host: process.env.AUTH_DB_HOST,
    database: process.env.AUTH_DB_NAME,
    password: process.env.AUTH_DB_PASS,
    port: process.env.AUTH_DB_PORT
});

authPool.on('error', (err) => {
    console.error('Erro inesperado no cliente do banco de autenticação', err);
    process.exit(-1);
});

// ESTA LINHA É A MAIS IMPORTANTE:
module.exports = authPool;