import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { serviceOrderCreatePayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';
import { asJsonValue } from '../obl.utils';

@Injectable()
export class ServiceOrderCreateHandler implements OdlActionHandler {
  readonly action = 'service_order_create';
  private readonly logger = new Logger(ServiceOrderCreateHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = serviceOrderCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid service_order_create payload: ${parsed.error.message}`);
      return;
    }
    const data = parsed.data;
    if (ctx.creator !== data.creator) {
      this.logger.warn('service_order_create: creator mismatch');
      return;
    }

    const existing = await this.oblRepository.findServiceOrder(data.service_order_id);
    if (existing) {
      this.logger.warn('service_order_create: service order already exists');
      return;
    }

    const contract = await this.oblRepository.findContract(data.contract_id);
    if (!contract) {
      this.logger.warn('service_order_create: contract not found');
      return;
    }

    const parties = new Set([contract.provider, contract.client]);
    if (!parties.has(data.creator)) {
      this.logger.warn('service_order_create: creator must be a contract party');
      return;
    }

    await this.oblRepository.insertServiceOrder({
      service_order_id: data.service_order_id,
      contract_id: contract.contract_id,
      creator: data.creator,
      provider: contract.provider,
      client: contract.client,
      details: asJsonValue(data.details ?? {}),
      created_event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_service_order_create',
      objectId: null,
      actor: data.creator,
      payload: {
        serviceOrderId: data.service_order_id,
        contractId: contract.contract_id,
        creator: data.creator,
        provider: contract.provider,
        client: contract.client,
      },
    });
  }
}
