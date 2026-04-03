import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  GetUserProfileEndpoint,
  type UserProfileView,
} from '../domain/users';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly getUserProfile: GetUserProfileEndpoint) {}

  @Get(':name/profile')
  async getProfile(@Param('name') name: string): Promise<UserProfileView> {
    const view = await this.getUserProfile.execute(name);
    if (!view) {
      throw new NotFoundException(`User not found: ${name}`);
    }
    return view;
  }
}
