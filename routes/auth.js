const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth.js');
const dbAuth = require('../db_auth');

if (!dbAuth) {
    console.error("ERRO CRÍTICO: dbAuth não foi carregado!");
    // Em um cenário real, você poderia querer que a aplicação pare aqui.
    // process.exit(1); 
}

// ==========================================================
// ROTA DE LOGIN (ATUALIZADA PARA INCLUIR O PERFIL)
// ==========================================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
            SELECT u.id, u.nome, u.email, u.password_hash, u.unidade_id, u.equipe_id, r.name as role_name 
            FROM public.users u 
            LEFT JOIN auth.user_roles ur ON u.id = ur.user_id 
            LEFT JOIN auth.roles r ON ur.role_id = r.id 
            WHERE u.email = $1
        `;
        
        const result = await dbAuth.query(query, [email]);
        const user = result.rows.length > 0 ? result.rows[0] : null;

        // --- DEBUG LOGIN ---
        console.log('--- DEBUG LOGIN ---');
        console.log('1. Email buscado:', email);
        console.log('2. Usuário encontrado (ID):', user ? user.id : 'NÃO ENCONTRADO');
        console.log('3. Senha digitada (req.body):', password);
        console.log('4. Hash vindo do Banco:', user ? user.password_hash : 'CAMPO NULO');
        console.log('5. Tipo do Hash:', user ? typeof user.password_hash : 'N/A');

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('6. Resultado bcrypt.compare:', isMatch);

        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // Gera o Token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                perfil: user.role_name || 'visitante',
                unidadeId: user.unidade_id,
                equipeId: user.equipe_id
            },
            process.env.JWT_SECRET || 'seu_segredo_super_secreto',
            { expiresIn: '1h' }
        );

        // Retorna o token e informações do usuário
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                nome: user.nome, 
                email: user.email, 
                perfil: user.role_name,
                unidade_id: user.unidade_id,
                equipe_id: user.equipe_id
            } 
        });

    } catch (error) {
        console.error('ERRO DETALHADO LOGIN:', error); 
        res.status(500).json({ error: 'Erro interno no servidor durante o login.' });
    }
});

// Rota de registro
router.post('/register', async (req, res) => {
    const { nome, email, password } = req.body;
    if (!nome || !email || !password) return res.status(400).json({ error: 'Dados incompletos.' });

    try {
        const check = await dbAuth.query('SELECT 1 FROM public.users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(409).json({ error: 'Email já existe.' });

        const hash = await bcrypt.hash(password, 10);
        const newUser = await dbAuth.query(
            'INSERT INTO public.users (nome, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
            [nome, email, hash]
        );
        // Cria perfil de usuário comum por padrão
        await dbAuth.query('INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, (SELECT id FROM auth.roles WHERE name = $2))', [newUser.rows[0].id, 'visitante']);
        
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error('Erro ao registrar:', err);
        res.status(500).json({ error: 'Erro ao registrar.' });
    }
});

// Rota para buscar permissões do usuário logado
router.get('/me/permissions', authenticateToken, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    try {
        const query = `
            SELECT DISTINCT p.name
            FROM auth.permissions p
            JOIN auth.role_permissions rp ON p.id = rp.permission_id
            JOIN auth.user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1;
        `;
        const result = await dbAuth.query(query, [req.user.id]);
        const permissions = result.rows.map(row => row.name);
        res.json(permissions);
    } catch (error) {
        console.error('Erro ao buscar permissões do usuário:', error);
        res.status(500).json({ error: 'Erro interno ao buscar permissões.' });
    }
});

router.get('/emergency-reset', async (req, res) => {
    try {
        const newHash = await bcrypt.hash('123456', 10);
        await dbAuth.query(
            'UPDATE public.users SET password_hash = $1 WHERE email = $2',
            [newHash, 'admin@esus.com']
        );
        res.json({ message: "Senha resetada!", hash_gerado: newHash });
    } catch (error) {
        console.error('Erro no reset de emergência:', error);
        res.status(500).json({ error: 'Falha ao resetar a senha do admin.' });
    }
});

module.exports = router;