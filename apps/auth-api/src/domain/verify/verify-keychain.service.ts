import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PublicKey, Signature, cryptoUtils } from '@hiveio/dhive';
import { ChallengesRepository } from '../../repositories/challenges.repository';
import { HiveNodeService } from '../providers/hive-node.service';
import { IssueSessionService } from '../session/issue-session.service';

@Injectable()
export class VerifyKeychainService {
  constructor(
    private readonly challenges: ChallengesRepository,
    private readonly hive: HiveNodeService,
    private readonly sessions: IssueSessionService,
  ) {}

  async execute(input: {
    challengeId: string;
    username: string;
    signature: string;
    signedMessage: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const username = input.username.trim().toLowerCase().replace(/^@/, '');
    const challenge = await this.challenges.findById(input.challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Invalid challenge');
    }
    if (challenge.provider !== 'keychain') {
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
    if (challenge.message !== input.signedMessage) {
      throw new UnauthorizedException('Signed message mismatch');
    }

    const postingKey = await this.hive.getPostingPublicKey(username);
    if (!postingKey) {
      throw new UnauthorizedException('Could not load account posting key');
    }

    const digest = cryptoUtils.sha256(Buffer.from(input.signedMessage, 'utf8'));
    let signature: Signature;
    try {
      signature = Signature.fromString(input.signature);
    } catch {
      throw new UnauthorizedException('Invalid signature format');
    }

    const publicKey = PublicKey.fromString(postingKey);
    const valid = publicKey.verify(digest, signature);
    if (!valid) {
      throw new UnauthorizedException('Signature verification failed');
    }

    const marked = await this.challenges.markUsed(challenge.id, new Date());
    if (!marked) {
      throw new UnauthorizedException('Challenge already used');
    }

    return this.sessions.issueForUser({
      username,
      provider: 'keychain',
      ip: input.ip,
      deviceInfo: input.userAgent ?? null,
    });
  }
}
