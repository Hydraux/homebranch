import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { DomainExceptionFilter } from 'src/common/filters/domain-exception.filter';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  });

  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true, transform: true }));
  app.use(cookieParser());

  const port = process.env.PORT || 3000;
  const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';

  if (!existsSync(uploadsDirectory)) {
    logger.warn(`Uploads directory "${uploadsDirectory}" does not exist. Creating it...`);
    mkdirSync(uploadsDirectory, { recursive: true });
  }

  const booksDirectory = join(uploadsDirectory, 'books');
  if (!existsSync(booksDirectory)) {
    logger.warn(`Books directory "${booksDirectory}" does not exist. Creating it...`);
    mkdirSync(booksDirectory, { recursive: true });
  }
  const coverImagesDirectory = join(uploadsDirectory, 'cover-images');
  if (!existsSync(coverImagesDirectory)) {
    logger.warn(`Cover images directory "${coverImagesDirectory}" does not exist. Creating it...`);
    mkdirSync(coverImagesDirectory, { recursive: true });
  }
  const authorImagesDirectory = join(uploadsDirectory, 'author-images');
  if (!existsSync(authorImagesDirectory)) {
    logger.warn(`Author images directory "${authorImagesDirectory}" does not exist. Creating it...`);
    mkdirSync(authorImagesDirectory, { recursive: true });
  }
  const incomingDirectory = join(uploadsDirectory, 'incoming');
  if (!existsSync(incomingDirectory)) {
    logger.warn(`Incoming directory "${incomingDirectory}" does not exist. Creating it...`);
    mkdirSync(incomingDirectory, { recursive: true });
  }
  app.use('/uploads/cover-images', express.static(resolve(coverImagesDirectory)));
  app.use('/uploads/author-images', express.static(resolve(authorImagesDirectory)));
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});
