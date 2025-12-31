const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Garante que o middleware existe

// 1. IMPORTAÇÃO CORRETA DO BANCO DE DADOS
// Tenta importar o pool diretamente ou extraí-lo do objeto db
const db = require('../db'); 
const pool = db.pool || db; 

// ==========================================================
// ROTA: LISTAR EQUIPES (Para os Filtros)
// ==========================================================
router.get('/equipes', authenticateToken, async (req, res) => {
    try {
        // Query ajustada para buscar do schema public ou tb_dim_equipe
        const sql = `
            SELECT DISTINCT nu_ine, no_equipe 
            FROM tb_dim_equipe 
            WHERE st_registro_valido = 1 
            ORDER BY no_equipe ASC
        `;
        
        // CORREÇÃO CRÍTICA: Usa 'pool' que foi definido acima
        const result = await pool.query(sql);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar equipes:', error);
        res.status(500).json({ error: 'Erro interno ao carregar equipes' });
    }
});

// ==========================================================
// ROTA: LISTAR MICROÁREAS (Baseado na Equipe)
// ==========================================================
router.get('/microareas', authenticateToken, async (req, res) => {
    try {
        const { equipe } = req.query;
        let sql = '';
        let params = [];

        if (equipe) {
            sql = `
                SELECT DISTINCT tt.nu_micro_area
                FROM tb_fat_cidadao_territorio tt
                JOIN tb_fat_cidadao_pec pec ON tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec
                JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
                WHERE te.nu_ine = $1
                ORDER BY tt.nu_micro_area ASC
            `;
            params = [equipe];
        } else {
            // Se não tiver equipe, traz todas (limitado para não travar)
            sql = `SELECT DISTINCT nu_micro_area FROM tb_fat_cidadao_territorio ORDER BY nu_micro_area ASC LIMIT 100`;
        }

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Erro ao buscar microáreas:', error);
        res.status(500).json({ error: 'Erro interno ao carregar microáreas' });
    }
});

module.exports = router;