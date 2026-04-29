import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObjectsCoreRepository, ObjectAuthorityRepository } from '../../../repositories';
import { UserShopDeselectRepository } from '../../../repositories/user-shop-deselect.repository';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { authorityPayloadSchema } from '../odl-envelope.schema';
import {
  AdministrativeAuthorityChangedEvent,
  ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT,
} from '../authority-changed.event';
import {
  OwnershipAuthorityChangedEvent,
  OWNERSHIP_AUTHORITY_CHANGED_EVENT,
} from '../ownership-authority-changed.event';

@Injectable()
export class AuthorityHandler implements OdlActionHandler {
  readonly action = 'object_authority';
  private readonly logger = new Logger(AuthorityHandler.name);

  constructor(
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly objectAuthorityRepository: ObjectAuthorityRepository,
    private readonly userShopDeselectRepository: UserShopDeselectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = authorityPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid authority payload for action '${ctx.action}': ${result.error.message}`);
      return;
    }

    const { object_id, authority_type, method } = result.data;

    if (method === 'add') {
      const object = await this.objectsCoreRepository.findByObjectId(object_id);
      if (!object) {
        this.logger.warn(
          `authority: object '${object_id}' not found; skipping object_authority (method: add)`,
        );
        return;
      }

      await this.userShopDeselectRepository.remove(ctx.creator, object_id);

      await this.objectAuthorityRepository.create({
        object_id,
        account: ctx.creator,
        authority_type,
      });
      if (authority_type === 'administrative') {
        this.eventEmitter.emit(
          ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT,
          new AdministrativeAuthorityChangedEvent(ctx.creator),
        );
      }
      if (authority_type === 'ownership') {
        this.eventEmitter.emit(
          OWNERSHIP_AUTHORITY_CHANGED_EVENT,
          new OwnershipAuthorityChangedEvent(ctx.creator),
        );
      }
      return;
    }

    if (method === 'remove') {
      await this.objectAuthorityRepository.delete(object_id, ctx.creator, authority_type);
      if (authority_type === 'administrative') {
        this.eventEmitter.emit(
          ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT,
          new AdministrativeAuthorityChangedEvent(ctx.creator),
        );
      }
      if (authority_type === 'ownership') {
        this.eventEmitter.emit(
          OWNERSHIP_AUTHORITY_CHANGED_EVENT,
          new OwnershipAuthorityChangedEvent(ctx.creator),
        );
      }
      return;
    }
  }
}
