// utils/errorHandler.js
// Tratamento centralizado de erros

const logger = require('./logger');
const { MENSAGENS_ERRO } = require('../constants');

/**
 * Classe de erro customizada para a aplicação
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware de tratamento de erros
 */
function errorHandler(err, req, res, next) {
    // Se já foi enviada uma resposta, delega para o handler padrão do Express
    if (res.headersSent) {
        return next(err);
    }

    // Log do erro
    logger.error('Erro na requisição', {
        path: req.path,
        method: req.method,
        error: err
    });

    // Erro de validação
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details
        });
    }

    // Erro de validação de entrada
    if (err.message && err.message.includes('deve ser')) {
        return res.status(400).json({
            error: MENSAGENS_ERRO.VALIDACAO.DADOS_INVALIDOS,
            details: err.message
        });
    }

    // Erro do PostgreSQL
    if (err.code && err.code.startsWith('2')) {
        logger.error('Erro do PostgreSQL', err);
        return res.status(500).json({
            error: MENSAGENS_ERRO.BANCO_DADOS.CONSULTA,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Erro genérico
    res.status(500).json({
        error: MENSAGENS_ERRO.API.ERRO_INTERNO,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}

/**
 * Wrapper para rotas async (evita try/catch repetitivo)
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Cria um erro de validação
 */
function criarErroValidacao(mensagem, detalhes = {}) {
    return new AppError(mensagem, 400, detalhes);
}

/**
 * Cria um erro de não encontrado
 */
function criarErroNaoEncontrado(recurso = 'Recurso') {
    return new AppError(`${recurso} não encontrado.`, 404);
}

module.exports = {
    AppError,
    errorHandler,
    asyncHandler,
    criarErroValidacao,
    criarErroNaoEncontrado
};



