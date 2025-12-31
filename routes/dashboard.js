const express = require('express');
const router = express.Router();
const db = require('../db'); 
const pool = db.pool || db; // Garante compatibilidade com o pool de conexões

// GET /api/dashboard/indicators
router.get('/indicators', async (req, res) => {
    try {
        console.log('📊 Calculando indicadores do Dashboard (V.57)...');

        // =========================================================
        // QUERY C3: GESTANTES (Lógica Oficial V.57)
        // =========================================================
        // 1. Busca últimos registros com IG > 0 nos últimos 14 meses
        // 2. Filtra DUM ativa (DUM + 330 dias >= Hoje)
        const sqlC3 = `
            WITH ultimos_registros_positivos AS (
                SELECT DISTINCT ON (ap.co_fat_cidadao_pec)
                    ap.co_fat_cidadao_pec,
                    dim_dum.dt_registro AS data_dum_recente
                FROM tb_fat_atendimento_individual ap
                JOIN tb_dim_tempo t_atend ON ap.co_dim_tempo = t_atend.co_seq_dim_tempo
                LEFT JOIN tb_dim_tempo dim_dum ON ap.co_dim_tempo_dum = dim_dum.co_seq_dim_tempo
                WHERE t_atend.dt_registro >= (CURRENT_DATE - INTERVAL '14 months')
                  AND ap.nu_idade_gestacional_semanas > 0 
                ORDER BY ap.co_fat_cidadao_pec, t_atend.dt_registro DESC
            ),
            gestantes_validas AS (
                SELECT co_fat_cidadao_pec 
                FROM ultimos_registros_positivos
                WHERE (data_dum_recente + INTERVAL '330 days') >= CURRENT_DATE 
            )
            SELECT COUNT(*) as total FROM gestantes_validas
        `;

        // Executa a query
        const resultC3 = await pool.query(sqlC3);
        const totalGestantes = parseInt(resultC3.rows[0].total || 0);

        console.log('✅ C3 (Gestantes Ativas V.57):', totalGestantes);

        // Monta o objeto de resposta
        const data = {
            c1: 85,             // Mock (Fictício)
            c2: 120,            // Mock (Fictício)
            c3: totalGestantes, // <--- DADO REAL DO BANCO
            c4: 98,             // Mock (Fictício)
            c5: 150,            // Mock (Fictício)
            c6: 210,            // Mock (Fictício)
            c7: 315             // Mock (Fictício)
        };
        
        res.json(data);

    } catch (error) {
        console.error('🚨 Erro crítico no Dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar indicadores' });
    }
});

module.exports = router;
