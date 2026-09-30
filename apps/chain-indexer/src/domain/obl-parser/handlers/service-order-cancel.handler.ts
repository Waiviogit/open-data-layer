import { hiveBlockTimestampToDate } from '@opden-data-layer/core';
import { Injectable, Logger } from '@nestjs/common';
import { OblRepository } from '../../../repositories/obl.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { serviceOrderCancelPayloadSchema } from '../obl-envelope.schema';
import { OblNotificationService } from '../obl-notification.service';

@Injectable()
export class ServiceOrderCancelHandler implements OdlActionHandler {
  readonly action = 'service_order_cancel';
  private readonly logger = new Logger(ServiceOrderCancelHandler.name);

  constructor(
    private readonly oblRepository: OblRepository,
    private readonly oblNotifications: OblNotificationService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const parsed = serviceOrderCancelPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid service_order_cancel payload: ${parsed.error.message}`);
      return;
    }

    const serviceOrder = await this.oblRepository.findServiceOrder(
      parsed.data.service_order_id,
    );
    if (!serviceOrder) {
      this.logger.warn('service_order_cancel: service order not found');
      return;
    }

    const parties = new Set([serviceOrder.provider, serviceOrder.client]);
    if (!parties.has(ctx.creator)) {
      this.logger.warn('service_order_cancel: signer must be a contract party');
      return;
    }

    if (serviceOrder.status === 'cancelled') {
      return;
    }

    await this.oblRepository.cancelServiceOrder(serviceOrder.service_order_id, {
      cancelled_by: ctx.creator,
      cancelled_at: hiveBlockTimestampToDate(ctx.timestamp),
      cancelled_event_seq: ctx.eventSeq,
      cancelled_transaction_id: ctx.transactionId,
    });

    this.oblNotifications.emit(ctx, {
      type: 'obl_service_order_cancel',
      objectId: null,
      actor: ctx.creator,
      payload: {
        serviceOrderId: serviceOrder.service_order_id,
        contractId: serviceOrder.contract_id,
        canceller: ctx.creator,
        provider: serviceOrder.provider,
        client: serviceOrder.client,
      },
    });
  }
}
