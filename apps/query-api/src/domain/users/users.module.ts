import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { GetUserProfileEndpoint } from './get-user-profile.endpoint';

@Module({
  imports: [RepositoriesModule],
  providers: [GetUserProfileEndpoint],
  exports: [GetUserProfileEndpoint],
})
export class UsersModule {}
