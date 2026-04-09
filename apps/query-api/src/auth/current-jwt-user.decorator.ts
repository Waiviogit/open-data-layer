import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessUser } from './jwt-access.types';

export const CurrentJwtUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtAccessUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtAccessUser }>();
    const user = req.user;
    if (!user?.sub) {
      throw new UnauthorizedException(
        'CurrentJwtUser requires JwtAccessGuard on the route (or valid Bearer token).',
      );
    }
    return user;
  },
);
