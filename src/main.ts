import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors();
  const port = process.env.PORT || 3000;
  const uploadsDirectory = process.env.UPLOADS_DIRECTORY || './uploads';
  if (!existsSync(uploadsDirectory)) {
    logger.warn(
      `Uploads directory "${uploadsDirectory}" does not exist. Creating it...`,
    );
    mkdirSync(uploadsDirectory, { recursive: true });
  }

  const booksDirectory = join(uploadsDirectory, 'books');
  if (!existsSync(booksDirectory)) {
    logger.warn(
      `Books directory "${booksDirectory}" does not exist. Creating it...`,
    );
    mkdirSync(booksDirectory, { recursive: true });
  }
  const coverImagesDirectory = join(uploadsDirectory, 'cover-images');
  if (!existsSync(coverImagesDirectory)) {
    logger.warn(
      `Cover images directory "${coverImagesDirectory}" does not exist. Creating it...`,
    );
    mkdirSync(coverImagesDirectory, { recursive: true });
  }
  app.use('/uploads', express.static(join(process.cwd(), uploadsDirectory)));
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
