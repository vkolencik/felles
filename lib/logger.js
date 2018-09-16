const winston = require('winston');
require('winston-daily-rotate-file');

const logdir = 'logs/';
const loggingLevel = process.env.LOGGING_LEVEL || 'debug';

const transports = [
    new winston.transports.DailyRotateFile({
        level: loggingLevel,
        filename: logdir + 'debug-%DATE%.log',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        timestamp: true,
        handleExceptions: true
    }),
    new winston.transports.File({ filename: logdir + 'error.log', level: 'error', timestamp: true })
];

if (process.env.NODE_ENV === 'development') {
    transports.push(new winston.transports.Console({level: 'silly', handleExceptions: true, colorize: true, timestamp: true}))
}

module.exports = winston.createLogger({
    level: loggingLevel,
    transports: transports,
    format:  winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
    ),
    exitOnError: false
});
