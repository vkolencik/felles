import { createLogger, transports } from 'winston';
import { DailyRotateFile } from 'winston-daily-rotate-file';

export default createLogger({
    level: 'debug',
    transports: [
        new DailyRotateFile({ 
            level: 'debug',
            filename: 'debug-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            timestamp: true
        }),
        new transports.File({ filename: 'error.log', level: 'error', timestamp: true })
    ],
    exitOnError: false
}).logger;
