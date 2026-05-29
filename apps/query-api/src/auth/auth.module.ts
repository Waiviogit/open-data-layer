import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@opden-data-layer/clients';
import { AuthorOwnsAccountGuard } from './author-owns-account.guard';

@Module({
  imports: [JwtAuthModule],
  providers: [AuthorOwnsAccountGuard],
  exports: [JwtAuthModule, AuthorOwnsAccountGuard],
})
export class AuthModule {}
