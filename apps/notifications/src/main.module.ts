import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisClientModule } from '@opden-data-layer/clients';
import { ConsumersModule } from './consumers/consumers.module';
import notificationsConfig from './config/notifications.config';
import { DatabaseModule } from './database';
import { DomainModule } from './domain/domain.module';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/notifications/.env', '.env'],
      load: [notificationsConfig],
    }),
    RedisClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('redis.uri', 'redis://localhost:6379'),
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    WsModule,
    DomainModule,
    ConsumersModule,
  ],
})
export class MainModule {}
