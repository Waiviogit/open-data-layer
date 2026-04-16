import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { ConfigService } from '@nestjs/config';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 7200;
  await app.listen(port);
  Logger.log(
    `notifications WebSocket path: ws://localhost:${port}/notifications`,
    'Bootstrap',
  );
}

bootstrap();
