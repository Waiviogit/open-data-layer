import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisClientFactory } from '@opden-data-layer/clients';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  type GovernanceSnapshot,
} from '@opden-data-layer/objects-domain';
import { GovernanceResolverService } from './governance-resolver.service';
import {
  GovernanceObjectMutatedEvent,
  GOVERNANCE_OBJECT_MUTATED_EVENT,
} from './governance-object-mutated.event';
import { redisKey } from '../../constants/redis-keys';

const GOVERNANCE_SNAPSHOT_TTL_SECONDS = 60;

@Injectable()
export class GovernanceCacheService {
  private readonly logger = new Logger(GovernanceCacheService.name);

  constructor(
    private readonly governanceResolver: GovernanceResolverService,
    private readonly redisFactory: RedisClientFactory,
    private readonly config: ConfigService,
  ) {}

  async resolvePlatform(): Promise<GovernanceSnapshot> {
    const id = (this.config.get<string>('governance.objectId') ?? '').trim();
    if (id.length === 0) {
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    }
    return this.resolve(id);
  }

  async resolve(objectId: string): Promise<GovernanceSnapshot> {
    const trimmed = objectId.trim();
    if (trimmed.length === 0) {
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    }

    const redis = this.redisFactory.getClient(0);
    const key = redisKey.governanceSnapshot(trimmed);
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as GovernanceSnapshot;
      } catch {
        this.logger.warn(`governance cache: corrupt JSON for ${trimmed}; refetching`);
      }
    }

    const snapshot = await this.governanceResolver.resolve(trimmed);
    await redis.set(key, JSON.stringify(snapshot), GOVERNANCE_SNAPSHOT_TTL_SECONDS);
    return snapshot;
  }

  async invalidate(objectId: string): Promise<void> {
    const trimmed = objectId.trim();
    if (trimmed.length === 0) {
      return;
    }
    const redis = this.redisFactory.getClient(0);
    await redis.del(redisKey.governanceSnapshot(trimmed));
  }

  @OnEvent(GOVERNANCE_OBJECT_MUTATED_EVENT)
  async handleGovernanceObjectMutated(event: GovernanceObjectMutatedEvent): Promise<void> {
    await this.invalidate(event.objectId);
  }
}
