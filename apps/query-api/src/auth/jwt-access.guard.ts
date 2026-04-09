import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtAccessUser } from './jwt-access.types';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtAccessUser }>();
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = this.jwt.verify<{ sub: string; typ?: string }>(token);
      if (payload.typ !== 'access' || typeof payload.sub !== 'string' || !payload.sub) {
        throw new UnauthorizedException();
      }
      req.user = { sub: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
