import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { IdentitiesRepository } from '../../repositories/identities.repository';
import { RefreshSessionsRepository } from '../../repositories/refresh-sessions.repository';
import { parseDurationToMs } from '../../utils/parse-duration';
import { TokenService } from '../token/token.service';
import type { AuthProvider } from '../../database/types';
import type { JsonValue } from '../../database/types';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: { username: string };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class IssueSessionService {
  constructor(
    private readonly config: ConfigService,
    private readonly tokens: TokenService,
    private readonly identities: IdentitiesRepository,
    private readonly refreshSessions: RefreshSessionsRepository,
  ) {}

  async issueForUser(input: {
    username: string;
    provider: AuthProvider;
    ip?: string | null;
    deviceInfo?: string | null;
    identityMetadata?: JsonValue | null;
  }): Promise<SessionTokens> {
    const username = input.username.trim().toLowerCase();
    await this.identities.upsertIdentity({
      userId: username,
      provider: input.provider,
      providerSubject: username,
      metadata: input.identityMetadata ?? null,
    });

    const sessionId = randomUUID();
    const refreshToken = this.tokens.signRefreshToken(username, sessionId);
    const refreshHash = hashToken(refreshToken);
    const accessToken = this.tokens.signAccessToken(username);

    const refreshMs = parseDurationToMs(
      this.config.getOrThrow<string>('jwt.refreshExpiresIn'),
    );
    const expiresAt = new Date(Date.now() + refreshMs);

    await this.refreshSessions.insert({
      id: sessionId,
      user_id: username,
      auth_provider: input.provider,
      refresh_token_hash: refreshHash,
      expires_at: expiresAt,
      revoked_at: null,
      device_info: input.deviceInfo ?? null,
      ip: input.ip ?? null,
      created_at: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      user: { username },
    };
  }
}
