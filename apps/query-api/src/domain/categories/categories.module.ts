import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { GetUserCategoriesEndpoint } from './get-user-categories.endpoint';

@Module({
  imports: [RepositoriesModule],
  providers: [GetUserCategoriesEndpoint],
  exports: [GetUserCategoriesEndpoint],
})
export class CategoriesModule {}
