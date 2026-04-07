import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChallengesRepository } from '../../repositories/challenges.repository';
import { IssueSessionService } from '../session/issue-session.service';
import type { JsonValue } from '../../database/types';

interface HiveSignerMeResponse {
  user?: { name?: string };
  name?: string;
}

@Injectable()
export class HivesignerCallbackService {
  constructor(
    private readonly config: ConfigService,
    private readonly challenges: ChallengesRepository,
    private readonly sessions: IssueSessionService,
  ) {}

  async execute(input: {
    code: string;
    state: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const appName = this.config.get<string>('hivesigner.appName')?.trim();
    const clientSecret = this.config
      .get<string>('hivesigner.clientSecret')
      ?.trim();
    const callbackUrl = this.config.get<string>('hivesigner.callbackUrl')?.trim();
    if (!appName || !clientSecret || !callbackUrl) {
      throw new BadRequestException('HiveSigner is not configured');
    }

    const challenge =
      await this.challenges.findActiveHivesignerByState(input.state);
    if (!challenge) {
      throw new UnauthorizedException('Invalid state');
    }
    if (challenge.used_at) {
      throw new UnauthorizedException('Challenge already used');
    }
    if (challenge.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Challenge expired');
    }

    const apiBase =
      this.config.get<string>('hivesigner.apiUrl')?.trim() ||
      'https://hivesigner.com';

    const tokenRes = await fetch(`${apiBase}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        client_id: appName,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new UnauthorizedException(
        tokenJson.error ?? 'OAuth token exchange failed',
      );
    }

    const meRes = await fetch(`${apiBase}/api/me`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: tokenJson.access_token,
      },
      body: JSON.stringify({}),
    });
    const meJson = (await meRes.json()) as HiveSignerMeResponse;
    if (!meRes.ok) {
      throw new UnauthorizedException('HiveSigner /api/me failed');
    }

    const hiveName =
      meJson.user?.name ?? meJson.name ?? challenge.hive_username;
    const normalized = String(hiveName).trim().toLowerCase().replace(/^@/, '');
    if (normalized !== challenge.hive_username) {
      throw new UnauthorizedException('Hive account mismatch');
    }

    const marked = await this.challenges.markUsed(challenge.id, new Date());
    if (!marked) {
      throw new UnauthorizedException('Challenge already used');
    }

    return this.sessions.issueForUser({
      username: normalized,
      provider: 'hivesigner',
      ip: input.ip,
      deviceInfo: input.userAgent ?? null,
      identityMetadata: { hivesignerOAuth: true } as unknown as JsonValue,
    });
  }
}
