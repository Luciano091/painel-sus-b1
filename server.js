// server.js
// Servidor Express principal do Painel e-SUS

require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const { healthCheck } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================
// MIDDLEWARES
// ==========================================================

// Logging de requisições
app.use((req, res, next) => {
    const startTime = process.hrtime();
    
    res.on('finish', () => {
        const duration = process.hrtime(startTime);
        const durationInMs = (duration[0] * 1e9 + duration[1]) / 1e6;
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} [${durationInMs.toFixed(2)}ms]`);
    });
    next();
});

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));

// Parsing de URL encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================
// ROTAS
// ==========================================================

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de health check
app.get('/health', async (req, res) => {
    const dbHealth = await healthCheck();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
        status: dbHealth.status === 'healthy' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        database: dbHealth
    });
});

// --- IMPORTAÇÃO DAS ROTAS ---
const apiRoutes = require('./routes/api');
const auxRoutes = require('./routes/auxiliares');
const adminUsersRouter = require('./routes/admin/users');
const organizationRoutes = require('./routes/admin/organization');
const dashboardRoutes = require('./routes/dashboard');

// --- USO DAS ROTAS (A ORDEM IMPORTA!) ---

// 1. Rotas Específicas (Admin Users) - COLOCAR EM PRIMEIRO
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/organization', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 2. Rotas Genéricas (O Resto da API) - COLOCAR DEPOIS
app.use('/api', apiRoutes);
app.use('/api', auxRoutes);

// Rota 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
});

// ==========================================================
// TRATAMENTO DE ERROS
// ==========================================================

app.use(errorHandler);

// ==========================================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================================

const server = app.listen(PORT, () => {
    logger.info(`Servidor iniciado com sucesso`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        url: `http://localhost:${PORT}`
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido, encerrando servidor graciosamente...');
    server.close(() => {
        logger.info('Servidor encerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT recebido, encerrando servidor graciosamente...');
    server.close(() => {
        logger.info('Servidor encerrado');
        process.exit(0);
    });
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

module.exports = app;