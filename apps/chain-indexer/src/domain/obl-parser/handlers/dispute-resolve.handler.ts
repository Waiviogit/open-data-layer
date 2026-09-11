import { Injectable, Logger } from '@nestjs/common';
import { OblDisputeRule } from '@opden-data-layer/odl-db-types';

import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { disputeResolvePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { toUsdString } from '../obl.utils';

function sumAmountUsd(lines: readonly { amount_usd: string }[]): string {
  const total = lines.reduce((sum, line) => sum + Number(line.amount_usd), 0);
  return total.toFixed(8);
}

@Injectable()
export class DisputeResolveHandler implements OdlActionHandler {
  readonly action = 'dispute_resolve';
  private readonly logger = new Logger(DisputeResolveHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = disputeResolvePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid dispute_resolve payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.resolver) {
      this.logger.warn('dispute_resolve: resolver mismatch');
      return;
    }

    const dispute = await this.oblRepository.findDispute(data.dispute_id);
    if (!dispute || dispute.status !== 'open') {
      this.logger.warn('dispute_resolve: open dispute not found');
      return;
    }

    const invoice = await this.oblRepository.findInvoice(dispute.invoice_id);
    if (!invoice) {
      this.logger.warn('dispute_resolve: invoice not found');
      return;
    }

    const lines = await this.oblRepository.listLinesForInvoice(dispute.invoice_id);
    if (lines.length === 0) {
      this.logger.warn('dispute_resolve: invoice has no obligation lines');
      return;
    }
    if (!lines.every((line) => line.state === 'disputed')) {
      this.logger.warn('dispute_resolve: invoice is not disputed');
      return;
    }

    const contract = invoice.contract_id
      ? await this.oblRepository.findContract(invoice.contract_id)
      : null;

    const disputeRule: OblDisputeRule = contract?.dispute_rule ?? 'client';
    const arbiter = contract?.arbiter ?? null;
    const provider = contract?.provider ?? lines[0].beneficiary;
    const client = contract?.client ?? invoice.debtor;

    if (!this.canResolve(disputeRule, arbiter, provider, client, data.resolver)) {
      this.logger.warn('dispute_resolve: resolver not authorized by dispute_rule');
      return;
    }

    let finalUsd: string;
    try {
      finalUsd = toUsdString(data.final_amount_usd);
    } catch {
      this.logger.warn('dispute_resolve: invalid final_amount_usd');
      return;
    }

    const totalAmount = sumAmountUsd(lines);
    const isMulti = lines.length > 1;

    if (isMulti) {
      const finalNum = Number(finalUsd);
      const totalNum = Number(totalAmount);
      if (finalNum !== 0 && finalNum !== totalNum) {
        this.logger.warn('dispute_resolve: multi invoice requires all-void or all-confirm');
        return;
      }
    }

    await this.oblRepository.runInTransaction(async (trx) => {
      await this.oblRepository.resolveDispute(
        data.dispute_id,
        {
          final_amount_usd: finalUsd,
          resolver: data.resolver,
          resolved_event_seq: ctx.eventSeq,
        },
        trx,
      );

      if (isMulti && Number(finalUsd) === 0) {
        await this.oblRepository.updateLinesStateForInvoice(
          dispute.invoice_id,
          { state: 'void', final_amount_usd: '0.00000000' },
          trx,
        );
        return;
      }

      if (isMulti) {
        for (const line of lines) {
          await this.oblRepository.updateLine(
            line.line_id,
            { state: 'resolved', final_amount_usd: String(line.amount_usd) },
            trx,
          );
        }
        return;
      }

      await this.oblRepository.updateLinesStateForInvoice(
        dispute.invoice_id,
        { state: 'resolved', final_amount_usd: finalUsd },
        trx,
      );
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_dispute_resolve',
      objectId: null,
      actor: data.resolver,
      payload: {
        disputeId: data.dispute_id,
        invoiceId: dispute.invoice_id,
        disputant: dispute.disputant,
        resolver: data.resolver,
        debtor: invoice.debtor,
        beneficiaries: [...new Set(lines.map((line) => line.beneficiary))],
        amountUsd: finalUsd,
      },
    });
  }

  private canResolve(
    rule: OblDisputeRule,
    arbiter: string | null,
    provider: string,
    client: string,
    resolver: string,
  ): boolean {
    if (rule === 'arbiter') {
      return arbiter !== null && resolver === arbiter;
    }
    if (rule === 'client') {
      return resolver === client;
    }
    if (rule === 'provider') {
      return resolver === provider;
    }
    return false;
  }
}
