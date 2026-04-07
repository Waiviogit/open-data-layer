import { Module } from '@nestjs/common';
import { AuthDomainModule } from '../domain/auth-domain.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [AuthDomainModule],
  controllers: [AuthController],
})
export class ControllersModule {}
