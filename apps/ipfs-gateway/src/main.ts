import './openapi/registry';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setupSwagger } from './openapi/setup-swagger';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  const globalPrefix = 'ipfs-gateway';
  app.setGlobalPrefix(globalPrefix);
  setupSwagger(app);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `OpenAPI docs: http://localhost:${port}/${globalPrefix}/docs`,
  );
}

bootstrap();
