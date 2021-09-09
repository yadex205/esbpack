import pino from 'pino';

export const _logger = pino({
  name: 'esbpack',
  prettyPrint: {
    colorize: true,
    ignore: 'hostname,pid',
    translateTime: true,
  },
});

// Just re-defined pino's LogFn, for dts-bundle-generatlor
interface LogFn {
  <T extends object>(object: T, message?: string, ...args: unknown[]): void;
  (message: string, ...args: unknown[]): void;
}

export const logger = {
  fatal: _logger.fatal as LogFn,
  error: _logger.error as LogFn,
  warn: _logger.warn as LogFn,
  info: _logger.info as LogFn,
  debug: _logger.debug as LogFn,
};
