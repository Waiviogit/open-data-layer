import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import schedulerConfig from './config/scheduler.config';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/scheduler/.env', '.env'],
      load: [schedulerConfig],
    }),
    ScheduleModule.forRoot(),
    SchedulerModule,
  ],
})
export class MainModule {}
