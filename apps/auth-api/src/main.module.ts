import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ControllersModule } from './controllers';
import { DatabaseModule } from './database';
import { AuthDomainModule } from './domain/auth-domain.module';
import authApiConfig from './config/auth-api.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/auth-api/.env', '.env'],
      load: [authApiConfig],
    }),
    DatabaseModule,
    AuthDomainModule,
    ControllersModule,
  ],
})
export class MainModule {}
