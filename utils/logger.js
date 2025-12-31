// utils/logger.js
// Sistema de logging estruturado

/**
 * Logger simples e estruturado
 */
class Logger {
    constructor() {
        this.enableColors = process.env.NODE_ENV !== 'production';
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, data = {}) {
        const timestamp = this.formatTimestamp();
        const logData = {
            timestamp,
            level,
            message,
            ...data
        };

        if (this.enableColors) {
            const colors = {
                INFO: '\x1b[36m',   // Cyan
                WARN: '\x1b[33m',   // Yellow
                ERROR: '\x1b[31m',  // Red
                DEBUG: '\x1b[90m',  // Gray
                RESET: '\x1b[0m'
            };
            console.log(`${colors[level]}[${level}]${colors.RESET} ${timestamp} - ${message}`, data);
        } else {
            console.log(JSON.stringify(logData));
        }
    }

    info(message, data = {}) {
        this.formatMessage('INFO', message, data);
    }

    warn(message, data = {}) {
        this.formatMessage('WARN', message, data);
    }

    error(message, error = {}) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            ...error
        };
        this.formatMessage('ERROR', message, errorData);
    }

    debug(message, data = {}) {
        if (process.env.NODE_ENV === 'development') {
            this.formatMessage('DEBUG', message, data);
        }
    }

    logRequest(req, duration = null) {
        const logData = {
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip || req.connection.remoteAddress
        };

        if (duration !== null) {
            logData.duration = `${duration[0]}s ${duration[1] / 1000000}ms`;
        }

        this.info(`Request: ${req.method} ${req.path}`, logData);
    }

    logQuery(sql, params, duration = null) {
        const logData = {
            sql: sql.substring(0, 200), // Limita tamanho do log
            params: params,
            paramCount: params.length
        };

        if (duration !== null) {
            logData.duration = `${duration[0]}s ${duration[1] / 1000000}ms`;
        }

        this.debug('Database Query', logData);
    }
}

// Exporta instância singleton
module.exports = new Logger();



