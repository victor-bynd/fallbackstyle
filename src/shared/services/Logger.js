/**
 * Logger Service
 * Environment-aware logging utility that replaces console.log statements
 *
 * Usage:
 * import { logger } from './services/Logger';
 * logger.debug('Detailed debugging info', { data });
 * logger.info('General information');
 * logger.warn('Warning message');
 * logger.error('Error occurred', error);
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        // Set log level based on environment
        // In production, only show warnings and errors
        // In development, show all logs
        this.level = import.meta.env.PROD ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

        // Allow override via localStorage for debugging production builds
        let storedLevel = null;
        try {
            storedLevel = typeof window !== 'undefined'
                ? localStorage.getItem('LOG_LEVEL')
                : null;
        } catch { /* localStorage may be unavailable in restricted contexts */ }

        if (storedLevel && LOG_LEVELS[storedLevel] !== undefined) {
            this.level = LOG_LEVELS[storedLevel];
        }
    }

    /**
     * Set the logging level programmatically
     * @param {string} level - One of: 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'
     */
    setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            this.level = LOG_LEVELS[level];
            if (typeof window !== 'undefined') {
                localStorage.setItem('LOG_LEVEL', level);
            }
        }
    }

    /**
     * Get current log level
     * @returns {string} Current log level name
     */
    getLevel() {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.level);
    }

    /**
     * Internal method to format and output log messages
     */
    _log(level, levelName, color, ...args) {
        if (this.level <= level) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${levelName}]`;

            // Select the appropriate console method
            let method = console.log;
            if (level >= LOG_LEVELS.ERROR) method = console.error;
            else if (level >= LOG_LEVELS.WARN) method = console.warn;

            if (typeof window !== 'undefined' && window.console) {
                // Browser environment - use colors
                method.call(
                    console,
                    `%c${prefix}`,
                    `color: ${color}; font-weight: bold;`,
                    ...args
                );
            } else {
                // Node environment - plain text
                method.call(console, prefix, ...args);
            }
        }
    }

    /**
     * Log detailed debugging information (only in development)
     */
    debug(...args) {
        this._log(LOG_LEVELS.DEBUG, 'DEBUG', '#6B7280', ...args);
    }

    /**
     * Log general information
     */
    info(...args) {
        this._log(LOG_LEVELS.INFO, 'INFO', '#3B82F6', ...args);
    }

    /**
     * Log warnings
     */
    warn(...args) {
        this._log(LOG_LEVELS.WARN, 'WARN', '#F59E0B', ...args);
    }

    /**
     * Log errors
     */
    error(...args) {
        this._log(LOG_LEVELS.ERROR, 'ERROR', '#EF4444', ...args);
    }

    /**
     * Create a scoped logger with a prefix
     * @param {string} scope - Scope name (e.g., 'FontManagement', 'Persistence')
     * @returns {Object} Logger instance with scope prefix
     */
    scope(scope) {
        return {
            debug: (...args) => this.debug(`[${scope}]`, ...args),
            info: (...args) => this.info(`[${scope}]`, ...args),
            warn: (...args) => this.warn(`[${scope}]`, ...args),
            error: (...args) => this.error(`[${scope}]`, ...args)
        };
    }

    /**
     * Group related log messages
     */
    group(label) {
        if (this.level <= LOG_LEVELS.DEBUG && console.group) {
            console.group(label);
        }
    }

    groupEnd() {
        if (this.level <= LOG_LEVELS.DEBUG && console.groupEnd) {
            console.groupEnd();
        }
    }

    /**
     * Log a table (useful for arrays of objects)
     */
    table(data) {
        if (this.level <= LOG_LEVELS.DEBUG && console.table) {
            console.table(data);
        }
    }

    /**
     * Start a timer
     */
    time(label) {
        if (this.level <= LOG_LEVELS.DEBUG && console.time) {
            console.time(label);
        }
    }

    /**
     * End a timer
     */
    timeEnd(label) {
        if (this.level <= LOG_LEVELS.DEBUG && console.timeEnd) {
            console.timeEnd(label);
        }
    }
}

// Export singleton instance
export const logger = new Logger();

// Export LOG_LEVELS for external use
export { LOG_LEVELS };

// Export helper to create scoped loggers
export const createLogger = (scope) => logger.scope(scope);
