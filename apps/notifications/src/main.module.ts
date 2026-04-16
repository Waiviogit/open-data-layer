import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsumersModule } from './consumers/consumers.module';
import notificationsConfig from './config/notifications.config';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/notifications/.env', '.env'],
      load: [notificationsConfig],
    }),
    WsModule,
    ConsumersModule,
  ],
})
export class MainModule {}
