import winston from 'winston';
import path from 'path';

const logFormat = winston.format.printf(
  info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
);

const mainModule = require.main ? require.main.filename : module.filename;

const options: winston.LoggerOptions = {
  transports: [
    new winston.transports.File({filename: 'error.log', level: 'error'}),
    new winston.transports.File({
      filename: 'debug.log',
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.json()
      ),
    }),
  ],
  format: winston.format.combine(
    winston.format.label({label: path.basename(mainModule)}),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    // Format the metadata object
    winston.format.metadata({
      fillExcept: ['message', 'level', 'timestamp', 'label'],
    })
  ),
  exitOnError: false,
};

const logger = winston.createLogger(options);

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.colorize(),
        logFormat
      ),
    })
  );
}

export default logger;
