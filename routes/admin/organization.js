const express = require('express');
const router = express.Router();
// Conexão com o banco de dados principal (e-SUS PEC)
const pool = require('../../db');

/**
 * Rota para buscar todas as unidades de saúde nas tabelas nativas do e-SUS.
 * GET /api/admin/organization/units
 */
router.get('/units', async (req, res) => {
    try {
        const query = `
            SELECT 
                co_seq_unidade_saude AS id, 
                no_unidade_saude AS nome, 
                nu_cnes AS cnes 
            FROM 
                public.tb_unidade_saude 
            ORDER BY 
                no_unidade_saude ASC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar unidades de saúde (e-SUS nativo):', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

/**
 * Rota para buscar equipes de uma unidade de saúde específica nas tabelas nativas do e-SUS.
 * GET /api/admin/organization/teams/:unit_id
 */
router.get('/teams/:unit_id', async (req, res) => {
    const { unit_id } = req.params;

    if (!/^\d+$/.test(unit_id)) {
        return res.status(400).json({ message: 'ID de unidade inválido.' });
    }

    try {
        const query = `
            SELECT 
                co_seq_equipe AS id, 
                no_equipe AS nome, 
                nu_ine AS ine 
            FROM 
                public.tb_equipe 
            WHERE 
                co_unidade_saude = $1 
            ORDER BY 
                no_equipe ASC;
        `;
        const { rows } = await pool.query(query, [unit_id]);
        res.json(rows);
    } catch (error) {
        console.error(`Erro ao buscar equipes (e-SUS nativo) para a unidade ${unit_id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

module.exports = router;