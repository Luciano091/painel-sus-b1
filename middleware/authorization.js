// Corrigido: Importa a conexão do banco de autenticação diretamente da raiz do projeto.
const dbAuth = require('../db_auth');

const can = (requiredPermission) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Acesso negado. Token inválido ou não fornecido.' });
        }

        const userId = req.user.id;

        // Log de Debug Adicionado
        console.log('Verificando permissão:', requiredPermission, 'Para usuário:', userId);

        if (!dbAuth) {
            console.error('ERRO FATAL: Conexão com o banco de autenticação (dbAuth) não foi estabelecida.');
            return res.status(500).json({ error: 'Erro interno de configuração do servidor.' });
        }

        try {
            // Query corrigida para usar o schema 'auth' explicitamente.
            const query = `
                SELECT 1
                FROM auth.user_roles ur
                JOIN auth.role_permissions rp ON ur.role_id = rp.role_id
                JOIN auth.permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = $1 AND p.name = $2
                LIMIT 1;
            `;
            // Corrigido: Usa a conexão 'dbAuth'
            const result = await dbAuth.query(query, [userId, requiredPermission]);

            if (result.rows.length > 0) {
                return next(); // Usuário tem a permissão
            } else {
                // Usuário não tem a permissão
                return res.status(403).json({ error: 'Acesso proibido. Você não tem permissão para executar esta ação.' });
            }

        } catch (error) {
            console.error('Erro no middleware de autorização:', error);
            return res.status(500).json({ error: 'Erro interno ao verificar permissões.' });
        }
    };
};

module.exports = { can };
