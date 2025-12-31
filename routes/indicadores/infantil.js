// routes/indicadores/infantil.js
// Rotas do indicador de Desenvolvimento Infantil

const express = require('express');
const router = express.Router();
const { pool } = require('../../db');
const logger = require('../../utils/logger');
const { executarConsultaPaginada, calcularClassificacao } = require('../helpers/queryHelper');
const { validarFiltrosComuns } = require('../../utils/validators');
const { asyncHandler } = require('../../utils/errorHandler');
const { DIAS_EM_2_ANOS, PONTOS_POR_CRIANCA, PONTOS_MAXIMOS_POR_CRIANCA } = require('../../constants');

/**
 * GET /api/indicadores/infantil
 * Lista paginada de crianças < 2 anos
 */
router.get('/infantil', asyncHandler(async (req, res) => {
    const { equipe, microarea } = validarFiltrosComuns(req);
    let params = [];
    
    let whereClauses = [
        `(CURRENT_DATE - c.dt_nascimento) <= ${DIAS_EM_2_ANOS}`,
        `c.st_ativo = 1`
    ];
    
    let joins = `
        FROM public.tb_cidadao c
        LEFT JOIN public.tb_fat_cad_individual cad ON c.co_seq_cidadao = cad.co_fat_cidadao_pec
        LEFT JOIN public.tb_fat_cidadao_territorio tt ON cad.co_seq_fat_cad_individual = tt.co_fat_cad_individual
        LEFT JOIN public.tb_dim_equipe te ON tt.co_dim_equipe = te.co_seq_dim_equipe
    `;

    if (equipe) {
        params.push(equipe);
        whereClauses.push(`te.nu_ine = $${params.length}`);
    }
    if (microarea) {
        params.push(microarea);
        whereClauses.push(`tt.nu_micro_area = $${params.length}`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sqlDados = `
        SELECT 
            c.no_cidadao,
            c.nu_cpf,
            c.nu_cns,
            TO_CHAR(c.dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento,
            (CURRENT_DATE - c.dt_nascimento) AS idade_dias
        ${joins}
        ${whereString}
        ORDER BY
            c.no_cidadao ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    
    const sqlContagem = `
        SELECT COUNT(DISTINCT c.co_seq_cidadao)
        ${joins}
        ${whereString};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento', title: 'Data Nasc.' },
        { data: 'idade_dias', title: 'Idade (dias)' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, params, params, colunas);
}));

/**
 * GET /api/indicadores/kpi-infantil
 * KPI do indicador Desenvolvimento Infantil (C2)
 */
router.get('/kpi-infantil', asyncHandler(async (req, res) => {
    const { equipe, microarea } = validarFiltrosComuns(req);
    let params = [];
    let whereBase = [];

    let joinsBase = `
        FROM public.tb_cidadao c
        LEFT JOIN public.tb_fat_cad_individual cad ON c.co_seq_cidadao = cad.co_fat_cidadao_pec
        LEFT JOIN public.tb_fat_cidadao_territorio tt ON cad.co_seq_fat_cad_individual = tt.co_fat_cad_individual
        LEFT JOIN public.tb_dim_equipe te ON tt.co_dim_equipe = te.co_seq_dim_equipe
    `;

    if (equipe) {
        params.push(equipe);
        whereBase.push(`te.nu_ine = $${params.length}`);
    }
    if (microarea) {
        params.push(microarea);
        whereBase.push(`tt.nu_micro_area = $${params.length}`);
    }
    
    whereBase.push(`(CURRENT_DATE - c.dt_nascimento) <= ${DIAS_EM_2_ANOS}`);
    whereBase.push(`c.st_ativo = 1`);

    const whereString = whereBase.length > 0 ? `WHERE ${whereBase.join(' AND ')}` : '';

    const sqlQuery = `
        WITH Denominador AS (
            SELECT 
                c.co_seq_cidadao
            ${joinsBase}
            ${whereString}
            GROUP BY c.co_seq_cidadao
        ),
        RegraC_Contagem AS (
            SELECT 
                d.co_seq_cidadao
            FROM 
                Denominador d
            JOIN 
                public.tb_fat_atendimento_individual fat ON d.co_seq_cidadao = fat.co_fat_cidadao_pec
            WHERE 
                fat.nu_peso IS NOT NULL AND fat.nu_altura IS NOT NULL
            GROUP BY 
                d.co_seq_cidadao
            HAVING
                COUNT(DISTINCT fat.dt_final_atendimento) >= 9
        )
        SELECT
            0 AS "A",
            0 AS "B",
            (SELECT COUNT(*) FROM RegraC_Contagem) AS "C",
            0 AS "D",
            0 AS "E",
            (SELECT COUNT(*) FROM Denominador) AS "DN"
    `;

    try {
        const startTime = process.hrtime();
        const resultado = await pool.query(sqlQuery, params);
        const data = resultado.rows[0];

        const dn = parseInt(data.DN, 10);
        const pontos_c = parseInt(data.C, 10) * PONTOS_POR_CRIANCA;
        const nm_total = pontos_c;
        
        let pontuacaoFinal = 0.0;
        if (dn > 0) {
            pontuacaoFinal = (nm_total / (dn * PONTOS_MAXIMOS_POR_CRIANCA)) * 100;
        }

        const classificacao = calcularClassificacao(pontuacaoFinal, 'infantil');

        const duration = process.hrtime(startTime);
        logger.logQuery(sqlQuery.substring(0, 100), params, duration);

        res.json({
            A: data.A,
            B: data.B,
            C: data.C,
            D: data.D,
            E: data.E,
            NM: nm_total,
            DN: dn,
            PONTUAÇÃO: pontuacaoFinal.toFixed(1),
            CLASSIFICAÇÃO: classificacao
        });

    } catch (err) {
        logger.error(`Erro no KPI Infantil: ${req.path}`, err);
        throw err;
    }
}));

module.exports = router;



