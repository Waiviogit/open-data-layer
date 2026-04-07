import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'crypto';
import { Client as HiveSignerClient } from 'hivesigner';
import { ChallengesRepository } from '../../repositories/challenges.repository';
import type { AuthProvider } from '../../database/types';
import type { JsonValue } from '../../database/types';

export interface ChallengeResponse {
  challengeId: string;
  message: string;
  expiresAt: string;
  authorizeUrl?: string;
  state?: string;
  metadata?: Record<string, JsonValue>;
}

@Injectable()
export class CreateChallengeService {
  constructor(
    private readonly config: ConfigService,
    private readonly challenges: ChallengesRepository,
  ) {}

  async execute(input: {
    provider: AuthProvider;
    username: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<ChallengeResponse> {
    const normalizedUser = input.username.trim().toLowerCase().replace(/^@/, '');
    if (!normalizedUser) {
      throw new BadRequestException('username is required');
    }

    const ttl = this.config.get<number>('challenge.ttlSeconds') ?? 300;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ttl * 1000);
    const nonce = randomBytes(32).toString('hex');
    const challengeId = randomUUID();
    const origin = this.config.getOrThrow<string>('authAppDisplayOrigin');

    const message = `${origin} wants you to sign in as @${normalizedUser}\nNonce: ${nonce}\nIssuedAt: ${issuedAt.toISOString()}\nExpiresAt: ${expiresAt.toISOString()}`;

    if (input.provider === 'keychain' || input.provider === 'hiveauth') {
      await this.challenges.insert({
        id: challengeId,
        provider: input.provider,
        hive_username: normalizedUser,
        nonce,
        message,
        expires_at: expiresAt,
        used_at: null,
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
        metadata_json: null,
      });

      return {
        challengeId,
        message,
        expiresAt: expiresAt.toISOString(),
      };
    }

    if (input.provider === 'hivesigner') {
      const appName = this.config.get<string>('hivesigner.appName')?.trim();
      const callbackUrl = this.config
        .get<string>('hivesigner.callbackUrl')
        ?.trim();
      if (!appName || !callbackUrl) {
        throw new BadRequestException(
          'HiveSigner is not configured (HIVESIGNER_APP_NAME, HIVESIGNER_CALLBACK_URL)',
        );
      }

      const state = randomUUID();
      const scopeStr = this.config.get<string>('hivesigner.scope') ?? 'login';
      const scopes = scopeStr.split(',').map((s) => s.trim()).filter(Boolean);

      const hs = new HiveSignerClient({
        app: appName,
        callbackURL: callbackUrl,
        scope: scopes,
        responseType: 'code',
      });
      const authorizeUrl = hs.getLoginURL(state, normalizedUser);

      await this.challenges.insert({
        id: challengeId,
        provider: 'hivesigner',
        hive_username: normalizedUser,
        nonce,
        message,
        expires_at: expiresAt,
        used_at: null,
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
        metadata_json: { state, hivesigner: true } as unknown as JsonValue,
      });

      return {
        challengeId,
        message,
        expiresAt: expiresAt.toISOString(),
        authorizeUrl,
        state,
      };
    }

    throw new BadRequestException('Unsupported provider');
  }
}
