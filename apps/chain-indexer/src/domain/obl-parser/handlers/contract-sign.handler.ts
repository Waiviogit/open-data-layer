import { hiveBlockTimestampToDate, serviceOrderSchemaFromOfferTerms } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { contractSignPayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { normalizePair, asJsonValue } from '../obl.utils';

@Injectable()
export class ContractSignHandler implements OdlActionHandler {
  readonly action = 'contract_sign';
  private readonly logger = new Logger(ContractSignHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = contractSignPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid contract_sign payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.signer) {
      this.logger.warn('contract_sign: signer mismatch');
      return;
    }

    const offer = await this.oblRepository.findOfferVersion(
      data.offer_id,
      data.offer_version,
    );
    if (!offer || offer.status !== 'active') {
      this.logger.warn('contract_sign: offer version not found or inactive');
      return;
    }

    if (offer.kind === 'offer' && data.provider !== offer.author) {
      this.logger.warn('contract_sign: provider must match offer author');
      return;
    }
    if (offer.kind === 'request' && data.client !== offer.author) {
      this.logger.warn('contract_sign: client must match offer author');
      return;
    }

    const expectedSigner =
      offer.kind === 'offer' ? data.client : data.provider;
    if (data.signer !== expectedSigner) {
      this.logger.warn('contract_sign: wrong counterparty signer');
      return;
    }
    if (data.provider === data.client) {
      this.logger.warn('contract_sign: provider and client must differ');
      return;
    }

    const existing = await this.oblRepository.findContract(data.contract_id);
    if (existing) {
      this.logger.warn('contract_sign: contract already exists');
      return;
    }

    const { pairLow, pairHigh } = normalizePair(data.provider, data.client);
    const existingForPair = await this.oblRepository.findContractForOfferAndPair(
      data.offer_id,
      pairLow,
      pairHigh,
    );
    if (existingForPair) {
      this.logger.warn('contract_sign: contract already exists for offer and pair');
      return;
    }

    const hadLedger = await this.oblRepository.hasLedgerForPair(pairLow, pairHigh);
    const serviceOrderSchema = serviceOrderSchemaFromOfferTerms(offer.terms);

    await this.oblRepository.runInTransaction(async (trx) => {
      await this.oblRepository.insertContract(
        {
          contract_id: data.contract_id,
          offer_id: offer.offer_id,
          offer_version: offer.version,
          provider: data.provider,
          client: data.client,
          dispute_rule: offer.dispute_rule,
          arbiter: offer.arbiter,
          metadata: asJsonValue(data.metadata ?? {}),
          service_order_schema: serviceOrderSchema
            ? asJsonValue(serviceOrderSchema)
            : null,
          created_event_seq: ctx.eventSeq,
          transaction_id: ctx.transactionId,
          created_at: hiveBlockTimestampToDate(ctx.timestamp),
        },
        trx,
      );

      if (!hadLedger) {
        await this.oblRepository.insertLedger(
          {
            pair_low: pairLow,
            pair_high: pairHigh,
            started_event_seq: ctx.eventSeq,
          },
          trx,
        );
        await this.oblRepository.promotePendingLinesForPair(pairLow, pairHigh, trx);
      }
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_contract_sign',
      objectId: null,
      actor: data.signer,
      payload: {
        contractId: data.contract_id,
        offerId: offer.offer_id,
        provider: data.provider,
        client: data.client,
        signer: data.signer,
      },
    });
  }
}
