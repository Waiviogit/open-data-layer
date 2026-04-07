import { Injectable } from '@nestjs/common';
import { RefreshSessionsRepository } from '../../repositories/refresh-sessions.repository';
import { TokenService } from '../token/token.service';

@Injectable()
export class LogoutService {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshSessions: RefreshSessionsRepository,
  ) {}

  async execute(refreshToken: string): Promise<{ ok: true }> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    if (!payload) {
      return { ok: true };
    }
    await this.refreshSessions.revoke(payload.jti, new Date());
    return { ok: true };
  }
}
