import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { ObjectsCoreRepository } from '../../../repositories';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { offerUpdatePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { isLegalRefType, isServiceRefType, asJsonValue } from '../obl.utils';

@Injectable()
export class OfferUpdateHandler implements OdlActionHandler {
  readonly action = 'offer_update';
  private readonly logger = new Logger(OfferUpdateHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = offerUpdatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid offer_update payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.author) {
      this.logger.warn('offer_update: creator mismatch');
      return;
    }

    const latest = await this.oblRepository.findLatestOffer(data.offer_id);
    if (!latest || latest.author !== data.author) {
      this.logger.warn('offer_update: offer not found or unauthorized');
      return;
    }
    if (latest.status !== 'active') {
      this.logger.warn('offer_update: offer is retired');
      return;
    }

    const disputeRule = data.dispute_rule ?? latest.dispute_rule;
    const arbiter =
      data.arbiter !== undefined ? data.arbiter : latest.arbiter;
    if (disputeRule === 'arbiter' && !arbiter) {
      this.logger.warn('offer_update: arbiter required');
      return;
    }

    const serviceRef =
      data.service_ref !== undefined ? data.service_ref : latest.service_ref;
    const legalRef =
      data.legal_ref !== undefined ? data.legal_ref : latest.legal_ref;

    if (serviceRef) {
      const obj = await this.objectsCoreRepository.findByObjectId(serviceRef);
      if (!obj || !isServiceRefType(obj.object_type, latest.kind)) {
        this.logger.warn('offer_update: invalid service_ref');
        return;
      }
    }
    if (legalRef) {
      const obj = await this.objectsCoreRepository.findByObjectId(legalRef);
      if (!obj || !isLegalRefType(obj.object_type)) {
        this.logger.warn('offer_update: invalid legal_ref');
        return;
      }
    }

    await this.oblRepository.insertOffer({
      offer_id: latest.offer_id,
      version: latest.version + 1,
      kind: latest.kind,
      author: latest.author,
      name: data.name ?? latest.name,
      description: data.description ?? latest.description,
      tags: data.tags ?? latest.tags,
      service_ref: serviceRef,
      legal_ref: legalRef,
      terms: data.terms !== undefined ? asJsonValue(data.terms) : latest.terms,
      dispute_rule: disputeRule,
      arbiter,
      status: 'active',
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_offer_update',
      objectId: null,
      actor: latest.author,
      payload: {
        offerId: latest.offer_id,
        version: latest.version + 1,
        kind: latest.kind,
        name: data.name ?? latest.name,
        author: latest.author,
        arbiter,
      },
    });
  }
}
