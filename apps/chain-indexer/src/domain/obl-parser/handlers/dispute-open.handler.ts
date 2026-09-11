import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { disputeOpenPayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { toUsdString, authorizedDisputeResolver } from '../obl.utils';

@Injectable()
export class DisputeOpenHandler implements OdlActionHandler {
  readonly action = 'dispute_open';
  private readonly logger = new Logger(DisputeOpenHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = disputeOpenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid dispute_open payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.disputant) {
      this.logger.warn('dispute_open: disputant mismatch');
      return;
    }

    const invoice = await this.oblRepository.findInvoice(data.invoice_id);
    if (!invoice) {
      this.logger.warn('dispute_open: invoice not found');
      return;
    }

    const lines = await this.oblRepository.listLinesForInvoice(data.invoice_id);
    if (lines.length === 0) {
      this.logger.warn('dispute_open: invoice has no obligation lines');
      return;
    }

    const isParty =
      data.disputant === invoice.debtor ||
      lines.some((line) => line.beneficiary === data.disputant);
    if (!isParty) {
      this.logger.warn('dispute_open: disputant not party to invoice');
      return;
    }

    if (lines.some((line) => line.state === 'disputed' || line.state === 'void')) {
      this.logger.warn('dispute_open: invoice not disputable');
      return;
    }
    if (lines.every((line) => line.state === 'resolved')) {
      this.logger.warn('dispute_open: invoice not disputable');
      return;
    }

    const existing = await this.oblRepository.findDispute(data.dispute_id);
    if (existing) {
      this.logger.warn('dispute_open: dispute already exists');
      return;
    }

    const openForInvoice = await this.oblRepository.findOpenDisputeForInvoice(
      data.invoice_id,
    );
    if (openForInvoice) {
      this.logger.warn('dispute_open: invoice already has open dispute');
      return;
    }

    let proposedUsd: string;
    try {
      proposedUsd = toUsdString(data.proposed_amount_usd);
    } catch {
      this.logger.warn('dispute_open: invalid proposed_amount_usd');
      return;
    }

    await this.oblRepository.runInTransaction(async (trx) => {
      await this.oblRepository.insertDispute(
        {
          dispute_id: data.dispute_id,
          invoice_id: data.invoice_id,
          disputant: data.disputant,
          proposed_amount_usd: proposedUsd,
          status: 'open',
          final_amount_usd: null,
          resolver: null,
          created_event_seq: ctx.eventSeq,
          resolved_event_seq: null,
          transaction_id: ctx.transactionId,
          created_at: hiveBlockTimestampToDate(ctx.timestamp),
        },
        trx,
      );
      await this.oblRepository.updateLinesStateForInvoice(
        data.invoice_id,
        { state: 'disputed' },
        trx,
      );
    });

    const contract = invoice.contract_id
      ? await this.oblRepository.findContract(invoice.contract_id)
      : null;

    this.oblNotifications.emit(ctx, {
      type: 'obl_dispute_open',
      objectId: null,
      actor: data.disputant,
      payload: {
        disputeId: data.dispute_id,
        invoiceId: data.invoice_id,
        disputant: data.disputant,
        resolver: authorizedDisputeResolver(contract),
        debtor: invoice.debtor,
        beneficiaries: [...new Set(lines.map((line) => line.beneficiary))],
        amountUsd: proposedUsd,
      },
    });
  }
}
