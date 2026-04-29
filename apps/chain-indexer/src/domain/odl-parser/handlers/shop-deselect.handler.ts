import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserShopDeselectRepository } from '../../../repositories/user-shop-deselect.repository';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { userShopDeselectPayloadSchema } from '../odl-envelope.schema';
import {
  UserShopDeselectChangedEvent,
  USER_SHOP_DESELECT_CHANGED_EVENT,
} from '../user-shop-deselect-changed.event';

@Injectable()
export class ShopDeselectHandler implements OdlActionHandler {
  readonly action = 'user_shop_deselect';
  private readonly logger = new Logger(ShopDeselectHandler.name);

  constructor(
    private readonly userShopDeselectRepository: UserShopDeselectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = userShopDeselectPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(
        `Invalid user_shop_deselect payload for action '${ctx.action}': ${result.error.message}`,
      );
      return;
    }

    const { object_id, method } = result.data;
    try {
      if (method === 'add') {
        await this.userShopDeselectRepository.add(ctx.creator, object_id);
      } else {
        await this.userShopDeselectRepository.remove(ctx.creator, object_id);
      }
      this.eventEmitter.emit(
        USER_SHOP_DESELECT_CHANGED_EVENT,
        new UserShopDeselectChangedEvent(ctx.creator),
      );
    } catch (error) {
      this.logger.error(
        `user_shop_deselect failed for '${ctx.creator}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
