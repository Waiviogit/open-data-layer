import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import stackWatchdogConfig from './config/stack-watchdog.config';
import { StackWatchdogModule } from './stack-watchdog/stack-watchdog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/stack-watchdog/.env', '.env'],
      load: [stackWatchdogConfig],
    }),
    ScheduleModule.forRoot(),
    StackWatchdogModule,
  ],
})
export class MainModule {}
