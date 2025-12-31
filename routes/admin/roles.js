const express = require('express');
const router = express.Router();
const { roleService } = require('../../services/authService');
const { authenticateToken, checkPermission } = require('../../middleware/auth');

// Aplicar autenticação a todas as rotas deste arquivo
router.use(authenticateToken);

/**
 * @route   GET /api/admin/roles
 * @desc    Lista todos os perfis com suas permissões
 * @access  Privado (requer permissão 'roles.read')
 */
router.get('/', checkPermission('roles.read'), async (req, res) => {
    try {
        const roles = await roleService.getAll();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

/**
 * @route   POST /api/admin/roles
 * @desc    Cria um novo perfil
 * @access  Privado (requer permissão 'roles.create')
 */
router.post('/', checkPermission('roles.create'), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'O nome do perfil é obrigatório.' });
        }
        const newRole = await roleService.create({ name, description, permissions });
        res.status(201).json(newRole);
    } catch (error) {
        if (error.constraint === 'roles_name_key') {
            return res.status(409).json({ error: 'Um perfil com este nome já existe.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

/**
 * @route   PUT /api/admin/roles/:id
 * @desc    Atualiza um perfil (nome, descrição e permissões)
 * @access  Privado (requer permissão 'roles.update')
 */
router.put('/:id', checkPermission('roles.update'), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const updatedRole = await roleService.update(req.params.id, { name, description, permissions });
        if (!updatedRole) {
            return res.status(404).json({ error: 'Perfil não encontrado.' });
        }
        res.json(updatedRole);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

/**
 * @route   DELETE /api/admin/roles/:id
 * @desc    Deleta um perfil
 * @access  Privado (requer permissão 'roles.delete')
 */
router.delete('/:id', checkPermission('roles.delete'), async (req, res) => {
    try {
        // Evitar que o perfil 'admin' seja deletado
        const roleToDelete = await roleService.getAll(); // Simples, mas eficaz para poucos roles
        const roleInfo = roleToDelete.find(r => r.id == req.params.id);
        if (roleInfo && roleInfo.name === 'admin') {
            return res.status(403).json({ error: 'O perfil "admin" não pode ser deletado.' });
        }

        const deletedCount = await roleService.delete(req.params.id);
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Perfil não encontrado.' });
        }
        res.status(204).send(); // Sem conteúdo
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;
