const express = require('express');
const router = express.Router();
const db = require('../../db');      // Caminho corrigido (2 níveis)
const dbAuth = require('../../db_auth'); // Caminho corrigido (2 níveis)
const bcrypt = require('bcrypt');

// --- 1. ROTA DE PERFIS (IMPORTANTE: Restaurada para o dropdown funcionar) ---
router.get('/roles', async (req, res) => {
    try {
        // Se houver parametro ?nocache, ignoramos (já serve pra bust cache)
        const result = await dbAuth.query('SELECT * FROM auth.roles ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar perfis:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 2. LISTAR USUÁRIOS (GET /) - VERSÃO MAP + DEBUG ---
router.get('/', async (req, res) => {
    try {
        console.log('🔄 [v4] Iniciando listagem com MAPAS (Tabelas Corretas)...');
        
        // 1. Buscas Paralelas (Mais rápido) - AGORA NAS TABELAS CERTAS
        const [usersRes, unidadesRes, equipesRes, rolesRes] = await Promise.all([
            dbAuth.query('SELECT id, nome, email, unidade_id, equipe_id FROM public.users ORDER BY nome ASC'),
            db.query('SELECT co_seq_unidade_saude as id, no_unidade_saude as nome FROM tb_unidade_saude'),
            db.query('SELECT co_seq_equipe as id, no_equipe as nome FROM tb_equipe'),
            dbAuth.query('SELECT ur.user_id, r.name FROM auth.user_roles ur JOIN auth.roles r ON ur.role_id = r.id')
        ]);

        // 2. Criar MAPAS (Dicionários) para busca rápida e segura
        const unitMap = {};
        unidadesRes.rows.forEach(u => {
            unitMap[String(u.id).trim()] = u.nome;
        });

        const teamMap = {};
        equipesRes.rows.forEach(t => {
            teamMap[String(t.id).trim()] = t.nome;
        });

        const roleMap = {};
        rolesRes.rows.forEach(r => {
            roleMap[r.user_id] = r.name;
        });

        // 3. DEBUG CRUCIAL: Vamos ver se o ID 6 existe no mapa
        const idsNoMapa = Object.keys(unitMap).slice(0, 15); // Pega os 15 primeiros
        console.log(`📊 Total Unidades no Banco: ${unidadesRes.rows.length}`);
        console.log(`🔑 IDs de amostra no Mapa: ${idsNoMapa.join(', ')}...`);
        console.log(`🧐 O ID "6" existe no Mapa? ${unitMap["6"] ? 'SIM (' + unitMap["6"] + ')' : 'NÃO ❌'}`);

        // 4. Montar Lista Final
        const listaCompleta = usersRes.rows.map(user => {
            const uid = user.unidade_id ? String(user.unidade_id).trim() : null;
            const eid = user.equipe_id ? String(user.equipe_id).trim() : null;

            return {
                ...user,
                perfil: roleMap[user.id] || 'Sem Perfil',
                unidade: uid ? (unitMap[uid] || 'N/A') : 'N/A',
                equipe: eid ? (teamMap[eid] || 'N/A') : 'N/A'
            };
        });

        res.json(listaCompleta);

    } catch (error) {
        console.error('❌ Erro fatal na listagem:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 3. CRIAR USUÁRIO (POST /) ---
router.post('/', async (req, res) => {
    const { nome, email, password, perfil, unidade_id, equipe_id } = req.body;
    
    if (!nome || !email || !password || !perfil) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    try {
        const check = await dbAuth.query('SELECT id FROM public.users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(409).json({ error: 'Email já existe.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Ajuste para Null se vazio
        const und = unidade_id || null;
        const eqp = equipe_id || null;

        const result = await dbAuth.query(
            `INSERT INTO public.users (nome, email, password_hash, unidade_id, equipe_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
            [nome, email, hash, und, eqp]
        );
        
        const newUserId = result.rows[0].id;
        await dbAuth.query('INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2)', [newUserId, perfil]);

        res.status(201).json({ id: newUserId, message: 'Criado com sucesso' });

    } catch (error) {
        console.error('Erro ao criar:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 4. EDITAR USUÁRIO (PUT /:id) ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, password, perfil, unidade_id, equipe_id } = req.body;

    try {
        await dbAuth.query(
            `UPDATE public.users 
             SET nome=$1, email=$2, unidade_id=$3, equipe_id=$4, updated_at=NOW() 
             WHERE id=$5`,
            [nome, email, unidade_id || null, equipe_id || null, id]
        );

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            await dbAuth.query('UPDATE public.users SET password_hash=$1 WHERE id=$2', [hash, id]);
        }

        if (perfil) {
            await dbAuth.query('DELETE FROM auth.user_roles WHERE user_id=$1', [id]);
            await dbAuth.query('INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2)', [id, perfil]);
        }

        res.json({ message: 'Usuário atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 5. DELETAR USUÁRIO (DELETE /:id) ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Remove primeiro os relacionamentos (perfis) para evitar erro de chave estrangeira
        await dbAuth.query('DELETE FROM auth.user_roles WHERE user_id = $1', [id]);
        
        // 2. Remove o usuário
        await dbAuth.query('DELETE FROM public.users WHERE id = $1', [id]);
        
        res.json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
