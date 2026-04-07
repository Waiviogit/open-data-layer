import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { ChallengesRepository } from '../../repositories/challenges.repository';
import { IssueSessionService } from '../session/issue-session.service';

/**
 * Payload the browser sends after a successful HiveAuth flow.
 * `challenge` should match the server-issued challenge message when challenge signing was used.
 */
const hiveAuthAuthDataSchema = z.object({
  username: z.string(),
  expire: z.number(),
  challenge: z.string().optional(),
});

@Injectable()
export class VerifyHiveAuthService {
  constructor(
    private readonly challenges: ChallengesRepository,
    private readonly sessions: IssueSessionService,
  ) {}

  async execute(input: {
    challengeId: string;
    username: string;
    authData: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const username = input.username.trim().toLowerCase().replace(/^@/, '');
    let parsed: z.infer<typeof hiveAuthAuthDataSchema>;
    try {
      const raw = JSON.parse(input.authData) as unknown;
      parsed = hiveAuthAuthDataSchema.parse(raw);
    } catch {
      throw new BadRequestException('Invalid authData JSON');
    }

    if (parsed.username.trim().toLowerCase().replace(/^@/, '') !== username) {
      throw new UnauthorizedException('Username mismatch');
    }

    if (parsed.expire * 1000 < Date.now()) {
      throw new UnauthorizedException('HiveAuth session expired');
    }

    const challenge = await this.challenges.findById(input.challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Invalid challenge');
    }
    if (challenge.provider !== 'hiveauth') {
      throw new BadRequestException('Challenge provider mismatch');
    }
    if (challenge.used_at) {
      throw new UnauthorizedException('Challenge already used');
    }
    if (challenge.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Challenge expired');
    }
    if (challenge.hive_username !== username) {
      throw new UnauthorizedException('Username mismatch');
    }

    if (parsed.challenge !== undefined && parsed.challenge !== challenge.message) {
      throw new UnauthorizedException('Challenge text mismatch');
    }

    const marked = await this.challenges.markUsed(challenge.id, new Date());
    if (!marked) {
      throw new UnauthorizedException('Challenge already used');
    }

    return this.sessions.issueForUser({
      username,
      provider: 'hiveauth',
      ip: input.ip,
      deviceInfo: input.userAgent ?? null,
      identityMetadata: { hiveAuth: true },
    });
  }
}
