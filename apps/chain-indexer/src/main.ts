import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MainModule, {
    logger: ['log', 'error', 'warn'],
  });

  process.on('SIGINT', () => {
    void app.close().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void app.close().then(() => process.exit(0));
  });
  Logger.log(
    `🚀 Chain indexer running`,
  );
}

void bootstrap();
