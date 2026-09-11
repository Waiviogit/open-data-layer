import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { paymentConfirmPayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { normalizePair, toUsdString, asJsonValue } from '../obl.utils';

@Injectable()
export class PaymentConfirmHandler implements OdlActionHandler {
  readonly action = 'payment_confirm';
  private readonly logger = new Logger(PaymentConfirmHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = paymentConfirmPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid payment_confirm payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.receiver) {
      this.logger.warn('payment_confirm: receiver mismatch');
      return;
    }

    let confirmUsd: string;
    try {
      confirmUsd = toUsdString(data.amount_usd);
    } catch {
      this.logger.warn('payment_confirm: invalid amount_usd');
      return;
    }

    const createdAt = hiveBlockTimestampToDate(ctx.timestamp);

    if (data.declare_payment_id) {
      const pending = await this.oblRepository.findPayment(data.declare_payment_id);
      if (!pending || pending.receiver !== data.receiver) {
        this.logger.warn('payment_confirm: declare payment not found');
        return;
      }
      if (pending.state !== 'pending') {
        this.logger.warn('payment_confirm: declare payment is not pending');
        return;
      }

      await this.oblRepository.updatePayment(data.declare_payment_id, {
        state: 'confirmed',
        amount_usd: confirmUsd,
      });
      this.oblNotifications.emit(ctx, {
        type: 'obl_payment_confirm',
        objectId: null,
        actor: data.receiver,
        payload: {
          paymentId: data.declare_payment_id,
          payer: pending.payer,
          receiver: data.receiver,
          amountUsd: confirmUsd,
          state: 'confirmed',
        },
      });
      return;
    }

    if (!data.payer) {
      this.logger.warn('payment_confirm: payer required without declare_payment_id');
      return;
    }

    const existing = await this.oblRepository.findPayment(data.payment_id);
    if (existing) {
      this.logger.warn('payment_confirm: payment already exists');
      return;
    }

    const { pairLow, pairHigh } = normalizePair(data.payer, data.receiver);
    const startedSeq = await this.oblRepository.findLedgerStartedSeq(pairLow, pairHigh);
    if (startedSeq === null || ctx.eventSeq < startedSeq) {
      this.logger.warn('payment_confirm: no active ledger or before cutoff');
      return;
    }

    await this.oblRepository.insertPayment({
      payment_id: data.payment_id,
      payer: data.payer,
      receiver: data.receiver,
      amount_usd: confirmUsd,
      declared_amount_usd: confirmUsd,
      method: 'offchain',
      token_symbol: null,
      token_amount: null,
      rate_usd: null,
      state: 'confirmed',
      ref: asJsonValue({
        receiver_only_confirm: true,
        ...(data.ref ?? {}),
      }),
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: createdAt,
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_payment_confirm',
      objectId: null,
      actor: data.receiver,
      payload: {
        paymentId: data.payment_id,
        payer: data.payer,
        receiver: data.receiver,
        amountUsd: confirmUsd,
        state: 'confirmed',
      },
    });
  }
}
