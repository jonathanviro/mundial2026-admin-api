import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['*'];

  // Support wildcard subdomains by converting *.domain.com to regex
  const originFn = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || corsOrigins.includes('*')) return callback(null, true);
    const allowed = corsOrigins.some(pattern => {
      if (pattern === origin) return true;
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1); // .domain.com
        return origin.endsWith(suffix);
      }
      return false;
    });
    callback(null, allowed);
  };

  app.enableCors({
    origin: originFn,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-totem-key'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Aumentar límite para sincronización de tótems con muchos registros
  app.use(express.json({ limit: '10mb' }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API Server running on port ${port}`);
}
bootstrap();
