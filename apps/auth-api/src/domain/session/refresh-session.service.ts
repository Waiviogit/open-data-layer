import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { RefreshSessionsRepository } from '../../repositories/refresh-sessions.repository';
import { IssueSessionService } from './issue-session.service';
import { TokenService } from '../token/token.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshSessions: RefreshSessionsRepository,
    private readonly issue: IssueSessionService,
  ) {}

  async execute(
    refreshToken: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException();
    }
    const session = await this.refreshSessions.findActiveById(payload.jti);
    if (!session) {
      throw new UnauthorizedException();
    }
    if (session.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException();
    }
    const expectedHash = hashToken(refreshToken);
    if (session.refresh_token_hash !== expectedHash) {
      throw new UnauthorizedException();
    }
    await this.refreshSessions.revoke(session.id, new Date());
    return this.issue.issueForUser({
      username: payload.sub,
      provider: session.auth_provider,
      ip,
      deviceInfo: userAgent ?? null,
    });
  }
}
