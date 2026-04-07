import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(username: string): string {
    return this.jwt.sign(
      { sub: username, typ: 'access' },
      {
        expiresIn: this.config.getOrThrow<string>(
          'jwt.accessExpiresIn',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  signRefreshToken(username: string, sessionId: string): string {
    return this.jwt.sign(
      { sub: username, typ: 'refresh', jti: sessionId },
      {
        expiresIn: this.config.getOrThrow<string>(
          'jwt.refreshExpiresIn',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  verifyAccessToken(token: string): { sub: string } | null {
    try {
      const p = this.jwt.verify<{ sub: string; typ?: string }>(token);
      if (p.typ !== 'access') {
        return null;
      }
      return { sub: p.sub };
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): { sub: string; jti: string } | null {
    try {
      const p = this.jwt.verify<{ sub: string; typ?: string; jti?: string }>(
        token,
      );
      if (p.typ !== 'refresh' || !p.jti) {
        return null;
      }
      return { sub: p.sub, jti: p.jti };
    } catch {
      return null;
    }
  }
}
