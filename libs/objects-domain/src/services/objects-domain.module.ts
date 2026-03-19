import { Module } from '@nestjs/common';
import { ObjectViewService } from './object-view.service';

@Module({
  providers: [ObjectViewService],
  exports: [ObjectViewService],
})
export class ObjectsDomainModule {}
