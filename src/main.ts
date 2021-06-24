import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { hostname } from 'os';

async function bootstrap() {
  const machineName = hostname()

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.label({ label: `${machineName} | ${process.env.NODE_ENV}` }),
        winston.format.printf(({ level, message, label, timestamp}) => {
          return `${timestamp} [${label}] ${level}: ${message}`
        })
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error'}),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console(),
      ]
    })
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  })); //validation to use the class-validator package on ALL incoming requests with data
  await app.listen(process.env.PORT);
}
bootstrap();
