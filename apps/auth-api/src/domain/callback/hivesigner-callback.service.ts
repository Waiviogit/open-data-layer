import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ChallengesRepository } from '../../repositories/challenges.repository';
import { IssueSessionService } from '../session/issue-session.service';
import type { JsonValue } from '../../database/types';

@Injectable()
export class HivesignerCallbackService {
  constructor(
    private readonly challenges: ChallengesRepository,
    private readonly sessions: IssueSessionService,
  ) {}

  async execute(input: {
    accessToken: string;
    username: string;
    state?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const accessToken = input.accessToken?.trim();
    const usernameRaw = input.username?.trim();
    if (!accessToken || !usernameRaw) {
      throw new BadRequestException('access_token and username are required');
    }

    const normalized = usernameRaw.toLowerCase().replace(/^@/, '');
    if (!normalized) {
      throw new UnauthorizedException('HiveSigner account name missing');
    }

    const state = input.state?.trim();
    if (state) {
      const challenge =
        await this.challenges.findActiveHivesignerByState(state);
      if (!challenge) {
        throw new UnauthorizedException('Invalid state');
      }
      if (challenge.used_at) {
        throw new UnauthorizedException('Challenge already used');
      }
      if (challenge.expires_at.getTime() < Date.now()) {
        throw new UnauthorizedException('Challenge expired');
      }
      const expectedUser = challenge.hive_username.trim();
      if (expectedUser && normalized !== expectedUser) {
        throw new UnauthorizedException('Hive account mismatch');
      }

      const marked = await this.challenges.markUsed(challenge.id, new Date());
      if (!marked) {
        throw new UnauthorizedException('Challenge already used');
      }
    }

    const session = await this.sessions.issueForUser({
      username: normalized,
      provider: 'hivesigner',
      ip: input.ip,
      deviceInfo: input.userAgent ?? null,
      identityMetadata: { hivesignerOAuth: true } as unknown as JsonValue,
    });

    return {
      ...session,
      hsToken: accessToken,
    };
  }
}
