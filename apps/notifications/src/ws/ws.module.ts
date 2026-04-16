import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ConnectionRegistryService } from './connection-registry.service';
import { HeartbeatService } from './heartbeat.service';
import { NotificationsGateway } from './notifications.gateway';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    ConnectionRegistryService,
    SubscriptionService,
    HeartbeatService,
    NotificationsGateway,
  ],
  exports: [ConnectionRegistryService, SubscriptionService],
})
export class WsModule {}
