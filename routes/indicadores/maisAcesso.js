// routes/indicadores/maisAcesso.js
// Rotas do indicador "Mais Acesso"

const express = require('express');
const router = express.Router();
const { pool } = require('../../db');
const logger = require('../../utils/logger');
const { executarConsultaPaginada, calcularClassificacao } = require('../helpers/queryHelper');
const { validarFiltrosComuns, validarBooleano } = require('../../utils/validators');
const { asyncHandler } = require('../../utils/errorHandler');
const { 
    TIPOS_ATENDIMENTO_PROGRAMADO, 
    TIPOS_ATENDIMENTO_PADRAO,
    CBOs_VALIDOS 
} = require('../../constants');

/**
 * GET /api/indicadores/mais-acesso
 * Lista paginada de cidadãos com mais acesso
 */
router.get('/mais-acesso', asyncHandler(async (req, res) => {
    const { equipe, microarea, pagina } = validarFiltrosComuns(req);
    const filtroAtendimentos = validarBooleano(req.query.filtroAtendimentos);
    const filtroAgendamento = validarBooleano(req.query.filtroAgendamento);

    // Define tipos de atendimento baseado no filtro
    const tiposDeAtendimento = filtroAgendamento 
        ? TIPOS_ATENDIMENTO_PROGRAMADO 
        : TIPOS_ATENDIMENTO_PADRAO;

    let params = [tiposDeAtendimento];
    let whereClauses = [
        `t.co_seq_dim_tipo_atendimento = ANY($1::int[])`,
        `c.st_ativo = 1`
    ];
    
    let joins = `
        JOIN public.tb_fat_atendimento_individual a ON c.co_seq_cidadao = a.co_fat_cidadao_pec
        JOIN public.tb_dim_tipo_atendimento t ON a.co_dim_tipo_atendimento = t.co_seq_dim_tipo_atendimento
    `;

    if (equipe || microarea) {
        joins += `
            JOIN public.tb_fat_cad_individual cad ON c.co_seq_cidadao = cad.co_fat_cidadao_pec
            JOIN public.tb_fat_cidadao_territorio tt ON cad.co_seq_fat_cad_individual = tt.co_fat_cad_individual 
            JOIN public.tb_dim_equipe te ON tt.co_dim_equipe = te.co_seq_dim_equipe
        `;
        
        if (equipe) {
            params.push(equipe);
            whereClauses.push(`te.nu_ine = $${params.length}`);
        }
        if (microarea) {
            params.push(microarea);
            whereClauses.push(`tt.nu_micro_area = $${params.length}`);
        }
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const fromAndJoins = `
        FROM public.tb_cidadao c
        ${joins}
    `;

    // HAVING para filtro de atendimentos em 2025
    let havingClauses = [];
    if (filtroAtendimentos) {
        havingClauses.push(`COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM a.dt_final_atendimento) = EXTRACT(YEAR FROM CURRENT_DATE)) > 0`);
    }
    const havingString = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : '';

    const sqlDados = `
        SELECT 
            c.no_cidadao,
            c.nu_cpf,
            c.nu_cns,
            CASE 
                WHEN COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM a.dt_final_atendimento) = EXTRACT(YEAR FROM CURRENT_DATE)) > 0 
                THEN 'Sim' 
                ELSE 'Não' 
            END AS atendimento_ano_atual
        ${fromAndJoins}
        ${whereString}
        GROUP BY c.co_seq_cidadao, c.no_cidadao, c.nu_cpf, c.nu_cns
        ${havingString}
        ORDER BY c.no_cidadao ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    
    const sqlContagem = `
        SELECT COUNT(*) FROM (
            SELECT 1
            ${fromAndJoins}
            ${whereString}
            GROUP BY c.co_seq_cidadao
            ${havingString}
        ) as subquery;
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'atendimento_ano_atual', title: 'Atendeu em 2025?' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, params, params, colunas);
}));

/**
 * GET /api/indicadores/kpi-mais-acesso
 * KPI do indicador Mais Acesso
 */
router.get('/kpi-mais-acesso', asyncHandler(async (req, res) => {
    const { equipe, microarea } = validarFiltrosComuns(req);
    
    let params = [];
    let whereClauses = [];
    let joins = [];

    // JOIN para Regra de Equipe (Sempre obrigatório)
    joins.push(`
        JOIN public.tb_dim_equipe te_regra ON a.co_dim_equipe_1 = te_regra.co_seq_dim_equipe
    `);

    if (equipe) {
        params.push(equipe);
        whereClauses.push(`te_regra.nu_ine = $${params.length}`);

        if (microarea) {
            joins.push(`
                JOIN public.tb_fat_cad_individual cad ON a.co_fat_cidadao_pec = cad.co_fat_cidadao_pec
                JOIN public.tb_fat_cidadao_territorio tt ON cad.co_seq_fat_cad_individual = tt.co_fat_cad_individual
            `);
            params.push(microarea);
            whereClauses.push(`tt.nu_micro_area = $${params.length}`);
            whereClauses.push(`tt.co_dim_equipe = te_regra.co_seq_dim_equipe`);
        }
    } else {
        whereClauses.push(`
            (te_regra.no_equipe ILIKE 'PSF%' OR te_regra.no_equipe ILIKE 'ESF%' OR te_regra.no_equipe ILIKE 'EAP%')
        `);
    }
    
    whereClauses.push(`EXTRACT(YEAR FROM a.dt_final_atendimento) = EXTRACT(YEAR FROM CURRENT_DATE)`);

    params.push(CBOs_VALIDOS);
    whereClauses.push(`
        a.co_dim_cbo_1 IN (
            SELECT co_seq_dim_cbo FROM public.tb_dim_cbo WHERE nu_cbo = ANY($${params.length}::text[])
        )
    `);

    const sqlQuery = `
        SELECT
            COUNT(*) FILTER (
                WHERE 
                    a.co_dim_tipo_atendimento = ANY($${params.length + 1}::int[])
            ) AS numerador,
            COUNT(*) AS denominador
        FROM 
            public.tb_fat_atendimento_individual a
        ${joins.join(' ')}
        WHERE 
            ${whereClauses.join(' AND ')};
    `;

    params.push(TIPOS_ATENDIMENTO_PROGRAMADO);

    try {
        const startTime = process.hrtime();
        const resultado = await pool.query(sqlQuery, params);
        
        const { numerador, denominador } = resultado.rows[0];
        const num = parseInt(numerador, 10);
        const den = parseInt(denominador, 10);

        let resultadoPerc = 0.0;
        if (den > 0) {
            resultadoPerc = (num / den) * 100;
        }

        const classificacao = calcularClassificacao(resultadoPerc, 'mais-acesso');

        const duration = process.hrtime(startTime);
        logger.logQuery(sqlQuery.substring(0, 100), params, duration);

        res.json({
            numerador: num,
            denominador: den,
            resultado: resultadoPerc.toFixed(1),
            classificacao: classificacao
        });

    } catch (err) {
        logger.error(`Erro no KPI Mais Acesso: ${req.path}`, err);
        throw err;
    }
}));

module.exports = router;



