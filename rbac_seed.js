
const bcrypt = require('bcrypt');
const authPool = require('./routes/db_auth'); // ✅ Correto (sem chaves)
const SALT_ROUNDS = 10;

/**
 * Função principal para popular o banco de dados de autenticação (RBAC).
 */
async function seedDatabase() {
  console.log('Iniciando o script de seed para o banco de dados de autenticação...');
  
  // Usaremos um único cliente para todas as operações dentro de uma transação
  const client = await authPool.connect();
  console.log('Conexão com o banco de dados de autenticação estabelecida.');

  try {
    // Inicia a transação
    await client.query('BEGIN');
    console.log('Transação iniciada.');

    // --- 1. Criar Permissões ---
    const permissionsToCreate = ['manage_users', 'view_dashboard', 'edit_settings'];
    const permissionInserts = permissionsToCreate.map(name => {
      return client.query(
        'INSERT INTO permissions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id, name',
        [name]
      );
    });
    const insertedPermissions = await Promise.all(permissionInserts);
    console.log('Permissões criadas/verificadas.');
    
    // Mapeia as permissões para fácil acesso. Precisamos pegar os IDs de quem já existia também.
    const allPermissionsResult = await client.query('SELECT id, name FROM permissions WHERE name = ANY($1)', [permissionsToCreate]);
    const permissionsMap = new Map(allPermissionsResult.rows.map(p => [p.name, p.id]));
    

    // --- 2. Criar Roles ---
    const rolesToCreate = ['admin', 'user'];
    const roleInserts = rolesToCreate.map(name => {
      return client.query(
        'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id, name',
        [name]
      );
    });
    const insertedRoles = await Promise.all(roleInserts);
    console.log('Roles criadas/verificadas.');
    
    // Mapeia as roles
    const allRolesResult = await client.query('SELECT id, name FROM roles WHERE name = ANY($1)', [rolesToCreate]);
    const rolesMap = new Map(allRolesResult.rows.map(r => [r.name, r.id]));
    const adminRoleId = rolesMap.get('admin');

    if (!adminRoleId) {
      throw new Error('A role "admin" não pôde ser encontrada ou criada.');
    }

    // --- 3. Vincular Permissões à Role 'admin' ---
    const adminPermissions = [];
    for (const permId of permissionsMap.values()) {
        adminPermissions.push(
            client.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [adminRoleId, permId]
            )
        );
    }
    await Promise.all(adminPermissions);
    console.log('Todas as permissões foram associadas à role "admin".');

    // --- 4. Criar Usuário Admin ---
    const adminEmail = 'admin@esus.com';
    const adminPassword = '123mudar';
    
    // Verifica se o usuário já existe
    const userExists = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    let adminUserId;

    if (userExists.rowCount === 0) {
      console.log(`Criando usuário "Super Admin" com email ${adminEmail}...`);
      const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      const newUser = await client.query(
        'INSERT INTO users (nome, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['Super Admin', adminEmail, passwordHash]
      );
      adminUserId = newUser.rows[0].id;
      console.log('Usuário "Super Admin" criado com sucesso.');
    } else {
      adminUserId = userExists.rows[0].id;
      console.log('Usuário "Super Admin" já existe.');
    }

    // --- 5. Vincular Usuário à Role 'admin' ---
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [adminUserId, adminRoleId]
    );
    console.log('Usuário "Super Admin" associado à role "admin".');

    // Finaliza a transação
    await client.query('COMMIT');
    console.log('\nTransação concluída com sucesso!');
    console.log('✅ Seed do banco de dados de autenticação finalizado.');

  } catch (error) {
    // Em caso de erro, desfaz a transação
    await client.query('ROLLBACK');
    console.error('\n❌ Ocorreu um erro durante o seed. A transação foi revertida.');
    console.error('Detalhes do erro:', error.message);
  } finally {
    // Libera o cliente de volta para o pool e encerra a conexão do pool
    client.release();
    console.log('\nConexão com o banco de dados liberada.');
    await authPool.end();
    console.log('Pool de conexões com o banco de autenticação encerrado.');
  }
}

seedDatabase();
