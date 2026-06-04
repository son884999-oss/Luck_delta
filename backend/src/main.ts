import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 인터랙티브 API 문서 — 브라우저에서 모든 엔드포인트를 눈으로 보고 'Try it out'으로 실행
  const swaggerCfg = new DocumentBuilder()
    .setTitle('천문 Chunmun API')
    .setDescription('Astro-Wellness Twin-Pillar — 천문식탁(분석) · 오늘의 추천 음식')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerCfg));

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  Logger.log(`Chunmun backend ready → http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`API 문서(Swagger) → http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
