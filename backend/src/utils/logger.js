import pino from 'pino';

export const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {} // plain JSON in production — no transport needed
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
);