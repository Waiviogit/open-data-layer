import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessGuard } from './jwt-access.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {},
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtAccessGuard],
  exports: [JwtModule, JwtAccessGuard],
})
export class JwtAuthModule {}
