import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { invoiceIssuePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { normalizePair, toUsdString, asJsonValue, sumUsdAmounts } from '../obl.utils';

type NormalizedLine = {
  beneficiary: string;
  amountUsd: string;
  role?: string;
};

@Injectable()
export class InvoiceIssueHandler implements OdlActionHandler {
  readonly action = 'invoice_issue';
  private readonly logger = new Logger(InvoiceIssueHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = invoiceIssuePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid invoice_issue payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.issuer) {
      this.logger.warn('invoice_issue: issuer mismatch');
      return;
    }

    const existing = await this.oblRepository.findInvoice(data.invoice_id);
    if (existing) {
      this.logger.warn('invoice_issue: invoice already exists');
      return;
    }

    const lines = this.normalizeLines(data);
    const kind = lines.length > 1 ? 'multi' : 'single';

    const isAttestorIssue = this.isAttestorIssue(data.issuer, data.debtor, lines);
    let authorizedByGoverning = false;

    if (isAttestorIssue) {
      if (!data.contract_id) {
        this.logger.warn('invoice_issue: contract_id required for attestor invoice');
        return;
      }
      const contract = await this.oblRepository.findContract(data.contract_id);
      if (!contract) {
        this.logger.warn('invoice_issue: governing contract not found');
        return;
      }
      const parties = new Set([contract.provider, contract.client]);
      if (!parties.has(data.issuer) || !parties.has(data.debtor)) {
        this.logger.warn('invoice_issue: issuer and debtor must be parties to governing contract');
        return;
      }
      authorizedByGoverning = true;
    }

    const createdAt = hiveBlockTimestampToDate(ctx.timestamp);
    const { serviceOrderId, reportId } = await this.resolveInvoiceRefs(data);

    await this.oblRepository.runInTransaction(async (trx) => {
      await this.oblRepository.insertInvoice(
        {
          invoice_id: data.invoice_id,
          contract_id: data.contract_id ?? null,
          service_order_id: serviceOrderId,
          report_id: reportId,
          issuer: data.issuer,
          debtor: data.debtor,
          kind,
          details: asJsonValue(data.details ?? {}),
          created_event_seq: ctx.eventSeq,
          transaction_id: ctx.transactionId,
          created_at: createdAt,
        },
        trx,
      );

      const obligationLines = [];
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const { pairLow, pairHigh } = normalizePair(data.debtor, line.beneficiary);
        let state: 'confirmed' | 'pending' = 'pending';

        if (authorizedByGoverning) {
          state = 'confirmed';
          await this.oblRepository.insertLedger(
            {
              pair_low: pairLow,
              pair_high: pairHigh,
              started_event_seq: ctx.eventSeq,
            },
            trx,
          );
        } else if (await this.oblRepository.hasLedgerForPair(pairLow, pairHigh, trx)) {
          state = 'confirmed';
        }

        obligationLines.push({
          line_id: `${data.invoice_id}:${index}`,
          invoice_id: data.invoice_id,
          debtor: data.debtor,
          beneficiary: line.beneficiary,
          amount_usd: line.amountUsd,
          final_amount_usd: null,
          state,
          dispute_group: data.invoice_id,
          role: line.role ?? null,
          created_event_seq: ctx.eventSeq,
          transaction_id: ctx.transactionId,
          created_at: createdAt,
        });
      }

      await this.oblRepository.insertObligationLines(obligationLines, trx);
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_invoice_issue',
      objectId: null,
      actor: data.issuer,
      payload: {
        invoiceId: data.invoice_id,
        issuer: data.issuer,
        debtor: data.debtor,
        beneficiaries: [...new Set(lines.map((line) => line.beneficiary))],
        amountUsd: sumUsdAmounts(lines.map((line) => line.amountUsd)),
        contractId: data.contract_id ?? null,
      },
    });
  }

  private normalizeLines(
    data: z.infer<typeof invoiceIssuePayloadSchema>,
  ): NormalizedLine[] {
    if (data.beneficiaries !== undefined) {
      return data.beneficiaries.map((row) => ({
        beneficiary: row.beneficiary,
        amountUsd: row.amount_usd,
        role: row.role,
      }));
    }
    return [
      {
        beneficiary: data.creditor!,
        amountUsd: data.amount_usd!,
      },
    ];
  }

  private isAttestorIssue(
    issuer: string,
    debtor: string,
    lines: readonly NormalizedLine[],
  ): boolean {
    if (issuer === debtor) {
      return false;
    }
    return !lines.some((line) => line.beneficiary === issuer);
  }

  private async resolveInvoiceRefs(
    data: z.infer<typeof invoiceIssuePayloadSchema>,
  ): Promise<{ serviceOrderId: string | null; reportId: string | null }> {
    let serviceOrderId: string | null = data.service_order_id ?? null;
    let reportId: string | null = data.report_id ?? null;
    const invoiceContractId = data.contract_id ?? null;

    if (serviceOrderId) {
      const serviceOrder = await this.oblRepository.findServiceOrder(serviceOrderId);
      if (!serviceOrder) {
        this.logger.warn('invoice_issue: service_order_id not found, ignoring');
        serviceOrderId = null;
      } else if (invoiceContractId && serviceOrder.contract_id !== invoiceContractId) {
        this.logger.warn('invoice_issue: service_order contract mismatch, ignoring');
        serviceOrderId = null;
      }
    }

    if (reportId) {
      const report = await this.oblRepository.findReport(reportId);
      if (!report) {
        this.logger.warn('invoice_issue: report_id not found, ignoring');
        reportId = null;
      } else {
        const reportContractId = report.contract_id;
        if (invoiceContractId && reportContractId && reportContractId !== invoiceContractId) {
          this.logger.warn('invoice_issue: report contract mismatch, ignoring');
          reportId = null;
        } else if (
          serviceOrderId &&
          report.service_order_id &&
          report.service_order_id !== serviceOrderId
        ) {
          this.logger.warn('invoice_issue: report service_order mismatch, ignoring');
          reportId = null;
        }
      }
    }

    return { serviceOrderId, reportId };
  }
}
