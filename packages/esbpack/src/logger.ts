import pino from 'pino';

const _logger = pino({
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

interface Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
}

export const logger: Logger = _logger;
