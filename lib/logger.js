const winston = require('winston');

exports.logger = winston.createLogger({
    level: 'debug',
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ],
    exitOnError: false
}).logger;

