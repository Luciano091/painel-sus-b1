// routes/indicadores/outros.js
// Outros indicadores (Idosos, Gestantes, Diabetes, etc.)

const express = require('express');
const router = express.Router();
const { executarConsultaPaginada } = require('../helpers/queryHelper');
const { asyncHandler } = require('../../utils/errorHandler');
const { IDADE_MINIMA_IDOSO } = require('../../constants');

/**
 * GET /api/indicadores/idosos
 * Lista de pessoas idosas (+60 anos)
 */
router.get('/idosos', asyncHandler(async (req, res) => {
    const sqlDados = `
        SELECT 
            no_cidadao,
            nu_cpf,
            nu_cns,
            TO_CHAR(dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada,
            EXTRACT(YEAR FROM age(dt_nascimento)) AS idade
        FROM public.tb_cidadao
        WHERE EXTRACT(YEAR FROM age(dt_nascimento)) > ${IDADE_MINIMA_IDOSO}
        ORDER BY no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;
    
    const sqlContagem = `
        SELECT COUNT(*) 
        FROM public.tb_cidadao 
        WHERE EXTRACT(YEAR FROM age(dt_nascimento)) > ${IDADE_MINIMA_IDOSO};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data Nasc.' },
        { data: 'idade', title: 'Idade' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/indicadores/gestantes
 * Lista de gestantes
 */
router.get('/gestantes', asyncHandler(async (req, res) => {
    const tabelasEJoin = `
        public.tb_cidadao AS t_cid
        JOIN public.tb_fat_cad_individual AS t_cad
        ON t_cid.co_seq_cidadao = t_cad.co_fat_cidadao_pec
    `;
    const regraWhere = 't_cad.st_gestante = 1';

    const sqlDados = `
        SELECT 
            t_cid.no_cidadao, 
            t_cid.nu_cns, 
            TO_CHAR(t_cid.dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada, 
            t_cid.nu_cpf
        FROM ${tabelasEJoin}
        WHERE ${regraWhere}
        ORDER BY t_cid.no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;
    
    const sqlContagem = `
        SELECT COUNT(*)
        FROM ${tabelasEJoin}
        WHERE ${regraWhere};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data Nasc.' },
        { data: 'nu_cpf', title: 'CPF' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/indicadores/diabetes
 * Lista de pessoas diabéticas
 */
router.get('/diabetes', asyncHandler(async (req, res) => {
    const tabelasEJoin = `
        public.tb_cidadao AS t_cid
        JOIN public.tb_fat_cad_individual AS t_cad
        ON t_cid.co_seq_cidadao = t_cad.co_fat_cidadao_pec
    `;
    const regraWhere = 't_cad.st_diabete = 1';

    const sqlDados = `
        SELECT 
            t_cid.no_cidadao, 
            t_cid.nu_cns, 
            TO_CHAR(t_cid.dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada, 
            t_cid.nu_cpf
        FROM ${tabelasEJoin}
        WHERE ${regraWhere}
        ORDER BY t_cid.no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;
    
    const sqlContagem = `
        SELECT COUNT(*)
        FROM ${tabelasEJoin}
        WHERE ${regraWhere};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data Nasc.' },
        { data: 'nu_cpf', title: 'CPF' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/indicadores/hipertensao
 * Lista de pessoas hipertensas
 */
router.get('/hipertensao', asyncHandler(async (req, res) => {
    const tabelasEJoin = `
        public.tb_cidadao AS t_cid
        JOIN public.tb_fat_cad_individual AS t_cad
        ON t_cid.co_seq_cidadao = t_cad.co_fat_cidadao_pec
    `;
    const regraWhere = 't_cad.st_hipertensao_arterial = 1';

    const sqlDados = `
        SELECT 
            t_cid.no_cidadao, 
            t_cid.nu_cns, 
            TO_CHAR(t_cid.dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada, 
            t_cid.nu_cpf
        FROM ${tabelasEJoin}
        WHERE ${regraWhere}
        ORDER BY t_cid.no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;
    
    const sqlContagem = `
        SELECT COUNT(*)
        FROM ${tabelasEJoin}
        WHERE ${regraWhere};
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data Nasc.' },
        { data: 'nu_cpf', title: 'CPF' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

/**
 * GET /api/indicadores/saude-mulher
 * Lista de mulheres
 */
router.get('/saude-mulher', asyncHandler(async (req, res) => {
    const sqlDados = `
        SELECT 
            no_cidadao,
            nu_cpf,
            nu_cns,
            TO_CHAR(dt_nascimento, 'DD/MM/YYYY') AS dt_nascimento_formatada
        FROM public.tb_cidadao
        WHERE no_sexo = 'FEMININO'
        ORDER BY no_cidadao ASC
        LIMIT $1 OFFSET $2;
    `;
    
    const sqlContagem = `
        SELECT COUNT(*) 
        FROM public.tb_cidadao 
        WHERE no_sexo = 'FEMININO';
    `;

    const colunas = [
        { data: 'no_cidadao', title: 'Nome' },
        { data: 'nu_cpf', title: 'CPF' },
        { data: 'nu_cns', title: 'CNS' },
        { data: 'dt_nascimento_formatada', title: 'Data Nasc.' }
    ];

    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, [], [], colunas);
}));

module.exports = router;



