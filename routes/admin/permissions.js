const express = require('express');
const router = express.Router();
const { permissionService } = require('../../services/authService');
const { authenticateToken, checkPermission } = require('../../middleware/auth');

/**
 * @route   GET /api/admin/permissions
 * @desc    Lista todas as permissões do sistema
 * @access  Privado (requer permissão 'roles.read')
 */
router.get(
    '/',
    authenticateToken,
    checkPermission('roles.read'),
    async (req, res) => {
        try {
            const permissions = await permissionService.getAll();
            res.json(permissions);
        } catch (error) {
            console.error('Erro ao buscar permissões:', error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    }
);

module.exports = router;
