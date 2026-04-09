import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessUser } from './jwt-access.types';
import { normalizeHiveAccount } from './normalize-hive-account';

@Injectable()
export class AuthorOwnsAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { user?: JwtAccessUser }
    >();
    const user = req.user;
    const author = req.params['author'] as string | undefined;
    if (!user?.sub || !author) {
      throw new ForbiddenException();
    }
    if (normalizeHiveAccount(author) !== normalizeHiveAccount(user.sub)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
