/**
 * Structured diagnostics logging utility for enterprise-grade operations.
 * Centralizes logging formats and handles color-coded terminal outputs in development.
 */
class LoggerService {
  constructor(namespace = 'App') {
    this.namespace = namespace;
    this.isDevelopment = import.meta.env.DEV;
  }

  formatMessage(level, message, context) {
    return {
      timestamp: new Date().toISOString(),
      namespace: this.namespace,
      level,
      message,
      context: context || null,
    };
  }

  info(message, context) {
    const logObj = this.formatMessage('INFO', message, context);
    if (this.isDevelopment) {
      console.log(`%c[INFO] [${logObj.namespace}] ${message}`, 'color: #0ea5e9; font-weight: bold;', context || '');
    }
  }

  warn(message, context) {
    const logObj = this.formatMessage('WARN', message, context);
    if (this.isDevelopment) {
      console.warn(`%c[WARN] [${logObj.namespace}] ${message}`, 'color: #f59e0b; font-weight: bold;', context || '');
    }
  }

  error(message, errorObject, context) {
    const logObj = this.formatMessage('ERROR', message, {
      ...context,
      error: errorObject ? {
        message: errorObject.message,
        stack: errorObject.stack,
        code: errorObject.code,
      } : null,
    });
    if (this.isDevelopment) {
      console.error(`%c[ERROR] [${logObj.namespace}] ${message}`, 'color: #ef4444; font-weight: bold;', errorObject, context || '');
    }
  }
}

export const logger = new LoggerService('AdminCRM');
export default logger;
