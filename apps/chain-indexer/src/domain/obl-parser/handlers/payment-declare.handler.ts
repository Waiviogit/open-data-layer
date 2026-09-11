import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { paymentDeclarePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { normalizePair, toUsdString, asJsonValue } from '../obl.utils';

@Injectable()
export class PaymentDeclareHandler implements OdlActionHandler {
  readonly action = 'payment_declare';
  private readonly logger = new Logger(PaymentDeclareHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = paymentDeclarePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid payment_declare payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.payer) {
      this.logger.warn('payment_declare: payer mismatch');
      return;
    }

    const existing = await this.oblRepository.findPayment(data.payment_id);
    if (existing) {
      this.logger.warn('payment_declare: payment already exists');
      return;
    }

    const { pairLow, pairHigh } = normalizePair(data.payer, data.receiver);
    const startedSeq = await this.oblRepository.findLedgerStartedSeq(pairLow, pairHigh);
    if (startedSeq === null || ctx.eventSeq < startedSeq) {
      this.logger.warn('payment_declare: no active ledger or before cutoff');
      return;
    }

    let amountUsd: string;
    try {
      amountUsd = toUsdString(data.amount_usd);
    } catch {
      this.logger.warn('payment_declare: invalid amount_usd');
      return;
    }

    await this.oblRepository.insertPayment({
      payment_id: data.payment_id,
      payer: data.payer,
      receiver: data.receiver,
      amount_usd: amountUsd,
      declared_amount_usd: amountUsd,
      method: 'offchain',
      token_symbol: null,
      token_amount: null,
      rate_usd: null,
      state: 'pending',
      ref: data.ref !== undefined ? asJsonValue(data.ref) : null,
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_payment_declare',
      objectId: null,
      actor: data.payer,
      payload: {
        paymentId: data.payment_id,
        payer: data.payer,
        receiver: data.receiver,
        amountUsd,
        state: 'pending',
      },
    });
  }
}
