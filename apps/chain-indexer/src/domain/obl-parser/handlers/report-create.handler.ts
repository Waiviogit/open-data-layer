import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { reportCreatePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { asJsonValue } from '../obl.utils';

@Injectable()
export class ReportCreateHandler implements OdlActionHandler {
  readonly action = 'report_create';
  private readonly logger = new Logger(ReportCreateHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = reportCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid report_create payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.author) {
      this.logger.warn('report_create: author mismatch');
      return;
    }

    const existing = await this.oblRepository.findReport(data.report_id);
    if (existing) {
      this.logger.warn('report_create: report already exists');
      return;
    }

    let contractId = data.contract_id ?? null;
    let serviceOrderId = data.service_order_id ?? null;

    if (serviceOrderId) {
      const serviceOrder = await this.oblRepository.findServiceOrder(serviceOrderId);
      if (!serviceOrder) {
        this.logger.warn('report_create: service order not found');
        return;
      }
      if (contractId && contractId !== serviceOrder.contract_id) {
        this.logger.warn('report_create: contract_id inconsistent with service order');
        return;
      }
      contractId = serviceOrder.contract_id;
    }

    if (!contractId) {
      this.logger.warn('report_create: could not resolve governing contract');
      return;
    }

    const contract = await this.oblRepository.findContract(contractId);
    if (!contract) {
      this.logger.warn('report_create: contract not found');
      return;
    }

    const parties = new Set([contract.provider, contract.client]);
    if (!parties.has(data.author)) {
      this.logger.warn('report_create: author must be a contract party');
      return;
    }

    await this.oblRepository.insertReport({
      report_id: data.report_id,
      contract_id: contract.contract_id,
      service_order_id: serviceOrderId,
      author: data.author,
      provider: contract.provider,
      client: contract.client,
      details: asJsonValue(data.details ?? {}),
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_report_create',
      objectId: null,
      actor: data.author,
      payload: {
        reportId: data.report_id,
        contractId: contract.contract_id,
        author: data.author,
        provider: contract.provider,
        client: contract.client,
      },
    });
  }
}
