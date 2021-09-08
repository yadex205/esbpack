import pino from 'pino';

export const logger = pino({
  name: 'esbpack',
  prettyPrint: {
    colorize: true,
    ignore: 'hostname,pid',
    translateTime: true,
  },
});
