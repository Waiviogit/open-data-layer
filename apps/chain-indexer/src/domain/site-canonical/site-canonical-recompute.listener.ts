import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CanonicalRecomputeRepository } from '../../repositories/canonical-recompute.repository';
import {
  SITE_CANONICAL_RECOMPUTE_EVENT,
  SiteCanonicalRecomputeEvent,
} from './site-canonical-recompute.event';

@Injectable()
export class SiteCanonicalRecomputeListener {
  private readonly logger = new Logger(SiteCanonicalRecomputeListener.name);

  constructor(
    private readonly queueRepository: CanonicalRecomputeRepository,
  ) {}

  @OnEvent(SITE_CANONICAL_RECOMPUTE_EVENT, { async: true })
  async onRecomputeRequested(event: SiteCanonicalRecomputeEvent): Promise<void> {
    try {
      await this.queueRepository.enqueue(event.objectId);
    } catch (e) {
      this.logger.error(
        `enqueue site canonical: ${(e as Error).message}`,
      );
    }
  }
}
