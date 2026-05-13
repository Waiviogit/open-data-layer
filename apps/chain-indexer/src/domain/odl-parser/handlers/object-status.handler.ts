import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GovernanceCacheService } from '../../governance/governance-cache.service';
import { ObjectsCoreRepository } from '../../../repositories';
import {
  OBJECT_STATUS_CREATED_EVENT,
  ObjectStatusCreatedEvent,
} from '../object-status-created.event';

@Injectable()
export class ObjectStatusHandler {
  private readonly logger = new Logger(ObjectStatusHandler.name);

  constructor(
    private readonly governanceCacheService: GovernanceCacheService,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
  ) {}

  @OnEvent(OBJECT_STATUS_CREATED_EVENT)
  async handleObjectStatusCreated(event: ObjectStatusCreatedEvent): Promise<void> {
    const snapshot = await this.governanceCacheService.resolvePlatform();
    if (!snapshot.admins.includes(event.creator)) {
      this.logger.warn(
        `UNAUTHORIZED_STATUS_UPDATE: signer '${event.creator}' is not a platform admin; skipping objects_core update for '${event.objectId}'`,
      );
      return;
    }

    await this.objectsCoreRepository.update(event.objectId, { status: event.status });
  }
}
