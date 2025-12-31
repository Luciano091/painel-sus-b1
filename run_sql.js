// run_sql.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('--- Iniciando execução de script SQL... ---');

// Pega o nome do arquivo do primeiro argumento da linha de comando
const fileName = process.argv[2];
if (!fileName) {
  console.error('❌ ERRO: Forneça o nome do arquivo SQL a ser executado.');
  console.log('Exemplo: node run_sql.js meu_script.sql');
  process.exit(1);
}

const sqlFilePath = path.join(__dirname, fileName);

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ ERRO: O arquivo "${fileName}" não foi encontrado no diretório.`);
  process.exit(1);
}

const authPool = new Pool({
  user: process.env.AUTH_DB_USER,
  host: process.env.AUTH_DB_HOST,
  database: process.env.AUTH_DB_NAME,
  password: process.env.AUTH_DB_PASS,
  port: process.env.AUTH_DB_PORT,
});

const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log(`Executando o script: ${fileName}`);

authPool.query(sql, (err, res) => {
  if (err) {
    console.error('❌ ERRO AO EXECUTAR O SCRIPT SQL:', err);
  } else {
    console.log('✅ SUCESSO! Script SQL executado.');
    if (res.rowCount !== null) {
      console.log(`${res.rowCount} linhas foram afetadas.`);
    }
  }
  authPool.end(); // Fecha a conexão
});
