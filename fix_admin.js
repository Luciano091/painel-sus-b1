const db = require('./routes/db_auth'); // O caminho que funcionou
const pool = db.pool || db;

async function detetive() {
    const client = await pool.connect();
    try {
        console.log('=============================================');
        console.log('🕵️‍♂️ DETETIVE DO BANCO DE DADOS');
        console.log('=============================================');
        
        // 1. Lista todos os usuários cadastrados
        const res = await client.query("SELECT id, nome, email, is_active FROM users");
        
        if (res.rows.length === 0) {
            console.log('❌ O BANCO ESTÁ VAZIO! Não há nenhum usuário na tabela.');
        } else {
            console.log(`✅ Encontrei ${res.rows.length} usuário(s):`);
            console.table(res.rows); // Mostra uma tabela bonitinha no terminal
        }

        // 2. Lista os perfis (roles)
        const roles = await client.query("SELECT * FROM roles");
        console.log('\n📋 Perfis disponíveis:');
        console.table(roles.rows);

    } catch (error) {
        console.error('❌ Erro na investigação:', error);
    } finally {
        client.release();
        process.exit();
    }
}

detetive();