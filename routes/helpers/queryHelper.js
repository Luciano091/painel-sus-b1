// routes/helpers/queryHelper.js
// Funções auxiliares para construção de queries SQL

const { pool } = require('../../db');
const logger = require('../../utils/logger');
const { PAGINACAO } = require('../../constants');
const { validarPaginacao } = require('../../utils/validators');

/**
 * Executa uma consulta paginada genérica
 */
async function executarConsultaPaginada(req, res, sqlDados, sqlContagem, paramsDados = [], paramsContagem = [], colunas) {
    const limit = PAGINACAO.LIMITE_PADRAO;
    let pagina = validarPaginacao(req);
    const offset = (pagina - 1) * limit;

    const paramsDadosComPaginacao = [...paramsDados, limit, offset];
    const paramsContagemFinal = paramsContagem.length > 0 ? paramsContagem : paramsDados;

    try {
        const startTime = process.hrtime();
        const [resultadoDados, resultadoTotal] = await Promise.all([
            pool.query(sqlDados, paramsDadosComPaginacao),
            pool.query(sqlContagem, paramsContagemFinal)
        ]);

        const totalItens = parseInt(resultadoTotal.rows[0].count, 10);
        const totalPaginas = Math.ceil(totalItens / limit);

        const duration = process.hrtime(startTime);
        logger.logQuery(sqlDados.substring(0, 100), paramsDadosComPaginacao, duration);

        res.json({
            data: resultadoDados.rows,
            pagination: {
                page: pagina,
                totalPages: totalPaginas,
                totalRows: totalItens
            },
            columns: colunas
        });

    } catch (err) {
        logger.error(`Erro na consulta paginada: ${req.path}`, err);
        throw err;
    }
}

/**
 * Calcula classificação de KPI baseado em percentual
 */
function calcularClassificacao(percentual, tipo = 'mais-acesso') {
    const { CLASSIFICACAO_MAIS_ACESSO, CLASSIFICACAO_INFANTIL } = require('../../constants');
    const classificacoes = tipo === 'infantil' ? CLASSIFICACAO_INFANTIL : CLASSIFICACAO_MAIS_ACESSO;

    if (tipo === 'infantil') {
        if (percentual > classificacoes.OTIMO.min) {
            return classificacoes.OTIMO.label;
        } else if (percentual > classificacoes.BOM.min) {
            return classificacoes.BOM.label;
        } else if (percentual > classificacoes.SUFICIENTE.min) {
            return classificacoes.SUFICIENTE.label;
        }
        return classificacoes.REGULAR.label;
    } else {
        // Mais Acesso
        if (percentual > classificacoes.OTIMO.min && percentual <= classificacoes.OTIMO.max) {
            return classificacoes.OTIMO.label;
        } else if (percentual > classificacoes.BOM.min && percentual <= classificacoes.BOM.max) {
            return classificacoes.BOM.label;
        } else if (percentual > classificacoes.SUFICIENTE.min && percentual <= classificacoes.SUFICIENTE.max) {
            return classificacoes.SUFICIENTE.label;
        }
        return classificacoes.REGULAR.label;
    }
}

module.exports = {
    executarConsultaPaginada,
    calcularClassificacao
};



