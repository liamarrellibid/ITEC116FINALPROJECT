import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './http-error.filter';

const helmet = require('helmet') as typeof import('helmet').default;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') || false });
  await app.listen(Number(process.env.PORT || 3000));
}
bootstrap();
