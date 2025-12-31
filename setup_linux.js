const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// --- Configuração ---
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const authDbName = 'sistema_auth';

/**
 * Função principal que orquestra a configuração do banco de dados.
 */
async function setupDatabase() {
  console.log('Iniciando script de configuração do ambiente Linux...');

  // --- Etapa 1: Testar conexão e criar o banco de dados de autenticação ---
  let adminClient;
  try {
    adminClient = new Client({ ...dbConfig, database: 'postgres' });
    await adminClient.connect();
    console.log('✅ Conexão com o PostgreSQL bem-sucedida.');

    const dbExists = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [authDbName]);

    if (dbExists.rowCount === 0) {
      console.log(`Banco de dados '${authDbName}' não encontrado. Criando...`);
      await adminClient.query(`CREATE DATABASE ${authDbName}`);
      console.log(`✅ Banco de dados '${authDbName}' criado com sucesso.`);
    } else {
      console.log(`ℹ️  Banco de dados '${authDbName}' já existe.`);
    }
  } catch (error) {
    console.error('❌ Erro crítico ao conectar ao PostgreSQL ou criar o banco de dados.');
    console.error('   Por favor, verifique as seguintes causas comuns:');
    console.error('   1. O serviço do PostgreSQL está ativo? (`sudo systemctl status postgresql`)');
    console.error('   2. As credenciais (usuário, senha, porta) no arquivo .env estão corretas?');
    console.error('   3. O arquivo pg_hba.conf permite a conexão do seu usuário?');
    console.error('Detalhes do erro:', error.message);
    return; // Encerra o script em caso de falha
  } finally {
    if (adminClient) {
      await adminClient.end();
    }
  }

  // --- Etapa 2: Conectar ao banco de autenticação e executar os scripts SQL ---
  let authClient;
  try {
    authClient = new Client({ ...dbConfig, database: authDbName });
    await authClient.connect();
    console.log(`\nConectado ao banco '${authDbName}' para criar a estrutura de tabelas.`);

    // Combina os dois arquivos SQL na ordem correta
    const schemaSql = await fs.readFile(path.join(__dirname, 'auth_db_schema.sql'), 'utf8');
    const rbacSql = await fs.readFile(path.join(__dirname, 'rbac_schema_seed.sql'), 'utf8');
    
    console.log('Executando script para criar a tabela `users`...');
    await authClient.query(schemaSql);
    console.log('✅ Tabela `users` verificada/criada.');
    
    console.log('Executando script RBAC (roles, permissions) e seed inicial...');
    await authClient.query(rbacSql);
    console.log('✅ Estrutura RBAC e seed do usuário "admin" concluídos com sucesso.');
    
    // --- Etapa 3: Verificação final ---
    const adminUser = await authClient.query("SELECT email, nome FROM users WHERE email = 'admin@example.com'");
    if (adminUser.rowCount > 0) {
        console.log('\n--- Resumo ---');
        console.log('✅ Configuração finalizada com sucesso!');
        console.log(`Usuário admin: ${adminUser.rows[0].email}`);
        console.log('Senha padrão: admin123 (a senha está armazenada em hash)');
        console.log('Banco de dados de autenticação pronto para uso.');
    } else {
        throw new Error('O usuário admin não foi encontrado após o seed.');
    }

  } catch (error) {
    console.error('\n❌ Erro ao configurar as tabelas ou ao fazer o seed no banco de autenticação.');
    console.error('Detalhes do erro:', error.message);
  } finally {
    if (authClient) {
      await authClient.end();
    }
  }
}

setupDatabase();
