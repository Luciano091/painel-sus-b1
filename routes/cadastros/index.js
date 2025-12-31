// routes/cadastros/index.js
// Rotas de gestão de cadastros

const express = require('express');
const router = express.Router();
const { executarConsultaPaginada } = require('../helpers/queryHelper');
const { asyncHandler } = require('../../utils/errorHandler');

/**
 * GET /api/cadastros/cidadao
 * Lista de cidadãos ativos
 */
router.get('/cidadao', asyncHandler(async (req, res) => {
    const filtroWhere = "WHERE st_ativo = 1 AND dt_obito IS NULL";
    
    const sqlDados = `
        SELECT 
            no_cidadao,
            nu_cpf,
            nu_cns,
            TO_CHAR(dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada
        FROM 
            public.tb_cidadao
        ${filtroWhere}
        ORDER BY 
            no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;

    const sqlContagem = `
        SELECT COUNT(*) 
        FROM public.tb_cidadao
        ${filtroWhere};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome do Cidadão' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data de Nascimento' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/cadastros/busca-ativa
 * Placeholder para busca ativa
 */
router.get('/busca-ativa', asyncHandler(async (req, res) => {
    res.json({
        data: [],
        pagination: { page: 1, totalPages: 1, totalRows: 0 },
        columns: [],
        mensagem: 'Rota "Busca Ativa" ainda não implementada.'
    });
}));

/**
 * GET /api/cadastros/sem-cpf
 * Lista de cidadãos sem CPF mas com CNS
 */
router.get('/sem-cpf', asyncHandler(async (req, res) => {
    const filtroWhere = `
        WHERE 
            (COALESCE(nu_cpf, '') = '') 
            AND (COALESCE(nu_cns, '') <> '')
            AND st_ativo = 1 
            AND dt_obito IS NULL
    `;
    
    const sqlDados = `
        SELECT 
            no_cidadao,
            nu_cpf, 
            nu_cns,
            TO_CHAR(dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada
        FROM 
            public.tb_cidadao
        ${filtroWhere}
        ORDER BY 
            no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;

    const sqlContagem = `
        SELECT COUNT(*) 
        FROM public.tb_cidadao
        ${filtroWhere};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome do Cidadão' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'dt_nascimento_formatada', title: 'Data de Nascimento' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/cadastros/duplicados
 * Lista de cidadãos duplicados
 */
router.get('/duplicados', asyncHandler(async (req, res) => {
    const cteDuplicados = `
        WITH Duplicados AS (
            SELECT no_cidadao, dt_nascimento
            FROM public.tb_cidadao
            WHERE no_cidadao IS NOT NULL AND dt_nascimento IS NOT NULL
            GROUP BY no_cidadao, dt_nascimento
            HAVING COUNT(*) > 1
        )
    `;

    const sqlDados = `
        ${cteDuplicados}
        SELECT 
            t_cid.no_cidadao, 
            t_cid.nu_cpf, 
            t_cid.nu_cns, 
            TO_CHAR(t_cid.dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada
        FROM 
            public.tb_cidadao AS t_cid
        JOIN 
            Duplicados AS d 
        ON 
            t_cid.no_cidadao = d.no_cidadao AND t_cid.dt_nascimento = d.dt_nascimento
        ORDER BY 
            t_cid.no_cidadao ASC, t_cid.dt_nascimento ASC
        LIMIT $1 OFFSET $2;
    `;

    const sqlContagem = `
        ${cteDuplicados}
        SELECT COUNT(t_cid.*)
        FROM 
            public.tb_cidadao AS t_cid
        JOIN 
            Duplicados AS d 
        ON 
            t_cid.no_cidadao = d.no_cidadao AND t_cid.dt_nascimento = d.dt_nascimento;
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome do Cidadão' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data de Nascimento' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

module.exports = router;



