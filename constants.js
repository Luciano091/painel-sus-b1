// constants.js
// Constantes globais do sistema

// ==========================================================
// CONSTANTES DE NEGÓCIO
// ==========================================================

// Idade e Períodos
const DIAS_EM_2_ANOS = 730;
const IDADE_MINIMA_IDOSO = 60;

// Tipos de Atendimento
const TIPOS_ATENDIMENTO_PROGRAMADO = [2, 3, 8];
const TIPOS_ATENDIMENTO_PADRAO = [2, 3, 4, 8, 9];

// CBOs Válidos
const CBOs_VALIDOS = ['225142', '223565'];

// Classificações de KPI
const CLASSIFICACAO_MAIS_ACESSO = {
    OTIMO: { min: 50, max: 70, label: 'Ótimo' },
    BOM: { min: 30, max: 50, label: 'Bom' },
    SUFICIENTE: { min: 10, max: 30, label: 'Suficiente' },
    REGULAR: { min: 0, max: 10, label: 'Regular' }
};

const CLASSIFICACAO_INFANTIL = {
    OTIMO: { min: 75, max: 100, label: 'Ótimo' },
    BOM: { min: 50, max: 75, label: 'Bom' },
    SUFICIENTE: { min: 25, max: 50, label: 'Suficiente' },
    REGULAR: { min: 0, max: 25, label: 'Regular' }
};

// Pontuação Infantil (C2)
const PONTOS_POR_CRIANCA = 20;
const PONTOS_MAXIMOS_POR_CRIANCA = 100;

// ==========================================================
// CONFIGURAÇÕES DE PAGINAÇÃO
// ==========================================================
const PAGINACAO = {
    LIMITE_PADRAO: 10,
    LIMITE_MAXIMO: 100,
    LIMITE_MINIMO: 1
};

// ==========================================================
// CONFIGURAÇÕES DO POOL DE CONEXÕES
// ==========================================================
const DB_POOL_CONFIG = {
    MAX: 20,
    MIN: 2,
    IDLE_TIMEOUT_MILLIS: 30000,
    CONNECTION_TIMEOUT_MILLIS: 2000
};

// ==========================================================
// MENSAGENS DE ERRO
// ==========================================================
const MENSAGENS_ERRO = {
    VALIDACAO: {
        EQUIPE_INVALIDA: 'Equipe inválida. Deve ser um número.',
        MICROAREA_INVALIDA: 'Microárea inválida. Deve ser um número.',
        PAGINA_INVALIDA: 'Página inválida. Deve ser um número maior que zero.',
        PARAMETRO_OBRIGATORIO: 'Parâmetro obrigatório não fornecido.'
    },
    BANCO_DADOS: {
        CONEXAO: 'Erro ao conectar ao banco de dados.',
        CONSULTA: 'Erro ao consultar o banco de dados.',
        TIMEOUT: 'Timeout na consulta ao banco de dados.'
    },
    API: {
        NAO_ENCONTRADO: 'Recurso não encontrado.',
        ERRO_INTERNO: 'Erro interno do servidor.',
        DADOS_INVALIDOS: 'Dados inválidos fornecidos.'
    }
};

module.exports = {
    DIAS_EM_2_ANOS,
    IDADE_MINIMA_IDOSO,
    TIPOS_ATENDIMENTO_PROGRAMADO,
    TIPOS_ATENDIMENTO_PADRAO,
    CBOs_VALIDOS,
    CLASSIFICACAO_MAIS_ACESSO,
    CLASSIFICACAO_INFANTIL,
    PONTOS_POR_CRIANCA,
    PONTOS_MAXIMOS_POR_CRIANCA,
    PAGINACAO,
    DB_POOL_CONFIG,
    MENSAGENS_ERRO
};



