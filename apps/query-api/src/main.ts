/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import './openapi/registry';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setupSwagger } from './openapi/setup-swagger';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  setupSwagger(app);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}/v1`,
  );
  Logger.log(
    `OpenAPI docs: http://localhost:${port}/${globalPrefix}/v1/docs`,
  );
}

bootstrap();
