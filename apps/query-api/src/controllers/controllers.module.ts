import { Module } from '@nestjs/common';
import { ObjectsModule } from '../domain/objects';
import { UsersModule } from '../domain/users';
import { ObjectsController } from './objects.controller';
import { UsersController } from './users.controller';

@Module({
  imports: [ObjectsModule, UsersModule],
  controllers: [ObjectsController, UsersController],
})
export class ControllersModule {}
