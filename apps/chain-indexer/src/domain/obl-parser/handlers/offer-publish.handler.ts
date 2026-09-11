import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { ObjectsCoreRepository } from '../../../repositories';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { offerPublishPayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { isLegalRefType, isServiceRefType, asJsonValue } from '../obl.utils';

@Injectable()
export class OfferPublishHandler implements OdlActionHandler {
  readonly action = 'offer_publish';
  private readonly logger = new Logger(OfferPublishHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = offerPublishPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid offer_publish payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.author) {
      this.logger.warn('offer_publish: creator mismatch');
      return;
    }
    if (data.dispute_rule === 'arbiter' && !data.arbiter) {
      this.logger.warn('offer_publish: arbiter required when dispute_rule=arbiter');
      return;
    }

    if (data.service_ref) {
      const obj = await this.objectsCoreRepository.findByObjectId(data.service_ref);
      if (!obj || !isServiceRefType(obj.object_type, data.kind)) {
        this.logger.warn('offer_publish: invalid service_ref object type');
        return;
      }
    }
    if (data.legal_ref) {
      const obj = await this.objectsCoreRepository.findByObjectId(data.legal_ref);
      if (!obj || !isLegalRefType(obj.object_type)) {
        this.logger.warn('offer_publish: invalid legal_ref object type');
        return;
      }
    }

    const latest = await this.oblRepository.findLatestOffer(data.offer_id);
    const version = latest ? latest.version + 1 : 1;

    await this.oblRepository.insertOffer({
      offer_id: data.offer_id,
      version,
      kind: data.kind,
      author: data.author,
      name: data.name,
      description: data.description ?? null,
      tags: data.tags ?? [],
      service_ref: data.service_ref ?? null,
      legal_ref: data.legal_ref ?? null,
      terms: asJsonValue(data.terms),
      dispute_rule: data.dispute_rule,
      arbiter: data.arbiter ?? null,
      status: 'active',
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_offer_publish',
      objectId: null,
      actor: data.author,
      payload: {
        offerId: data.offer_id,
        version,
        kind: data.kind,
        name: data.name,
        author: data.author,
        arbiter: data.arbiter ?? null,
      },
    });
  }
}
