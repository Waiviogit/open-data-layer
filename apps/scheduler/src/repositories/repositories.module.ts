import { Module } from '@nestjs/common';
import { SchedulerRepository } from './scheduler.repository';

@Module({
  providers: [SchedulerRepository],
  exports: [SchedulerRepository],
})
export class RepositoriesModule {}
