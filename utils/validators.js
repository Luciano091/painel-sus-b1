// utils/validators.js
// Funções de validação de entrada

const { MENSAGENS_ERRO, PAGINACAO } = require('../constants');

/**
 * Valida se um valor é um número inteiro positivo
 */
function validarNumeroInteiro(valor, nomeParametro) {
    if (valor === undefined || valor === null || valor === '') {
        return null; // Valor opcional
    }
    
    const numero = parseInt(valor, 10);
    if (isNaN(numero) || numero < 0) {
        throw new Error(`${nomeParametro} deve ser um número inteiro positivo.`);
    }
    
    return numero;
}

/**
 * Valida parâmetros de paginação
 */
function validarPaginacao(req) {
    let pagina = parseInt(req.query.pagina, 10);
    
    if (isNaN(pagina) || pagina < 1) {
        pagina = 1;
    }
    
    if (pagina > 10000) { // Limite razoável
        throw new Error('Número de página muito grande.');
    }
    
    return pagina;
}

/**
 * Valida filtro de equipe
 */
function validarEquipe(equipe) {
    if (!equipe) return null;
    
    const equipeNum = validarNumeroInteiro(equipe, 'Equipe');
    if (equipeNum === null) return null;
    
    return equipe;
}

/**
 * Valida filtro de microárea
 */
function validarMicroarea(microarea) {
    if (!microarea) return null;
    
    const microareaNum = validarNumeroInteiro(microarea, 'Microárea');
    if (microareaNum === null) return null;
    
    return microarea;
}

/**
 * Valida filtros booleanos (checkbox)
 */
function validarBooleano(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return false;
    }
    
    return valor === 'true' || valor === true;
}

/**
 * Sanitiza string para prevenir SQL injection básico
 */
function sanitizarString(valor) {
    if (typeof valor !== 'string') {
        return valor;
    }
    
    // Remove caracteres perigosos (já estamos usando parâmetros, mas é uma camada extra)
    return valor.replace(/[;'"\\]/g, '');
}

/**
 * Valida e sanitiza parâmetros de query comuns
 */
function validarFiltrosComuns(req) {
    return {
        equipe: validarEquipe(req.query.equipe),
        microarea: validarMicroarea(req.query.microarea),
        pagina: validarPaginacao(req)
    };
}

module.exports = {
    validarNumeroInteiro,
    validarPaginacao,
    validarEquipe,
    validarMicroarea,
    validarBooleano,
    sanitizarString,
    validarFiltrosComuns
};



