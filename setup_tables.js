const fs = require('fs');
const path = require('path');
// Importa o módulo do banco
const dbModule = require('./routes/db_auth');

// Tenta obter a conexão de várias formas possíveis para evitar o erro "not a function"
// 1. Se exportou direto (module.exports = pool)
// 2. Se exportou nomeado (module.exports = { authPool: pool })
// 3. Se exportou como pool (module.exports = { pool: pool })
const pool = dbModule.authPool || dbModule.pool || dbModule;

async function runMigration() {
    try {
        console.log("🔌 Conectando ao banco de autenticação...");
        
        // Verifica se a conexão é válida antes de tentar usar
        if (!pool || typeof pool.query !== 'function') {
            throw new Error('A conexão com o banco não foi carregada corretamente. Verifique o arquivo db_auth.js');
        }

        const sql = fs.readFileSync(path.join(__dirname, 'auth_db_schema.sql')).toString();
        
        console.log("🔨 Criando tabelas...");
        await pool.query(sql);
        
        console.log("✅ Sucesso! Tabelas criadas.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro ao criar tabelas:", err.message);
        // Mostra o que foi recebido para ajudar no debug, se necessário
        console.error("Objeto recebido do db_auth:", dbModule); 
        process.exit(1);
    }
}

runMigration();