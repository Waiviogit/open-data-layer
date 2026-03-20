import { Module } from '@nestjs/common';
import { ObjectsModule } from '../domain/objects';
import { ObjectsController } from './objects.controller';

@Module({
  imports: [ObjectsModule],
  controllers: [ObjectsController],
})
export class ControllersModule {}
