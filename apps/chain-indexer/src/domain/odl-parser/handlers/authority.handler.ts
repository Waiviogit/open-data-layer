import { Injectable, Logger } from '@nestjs/common';
import { ObjectsCoreRepository, ObjectAuthorityRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { authorityPayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class AuthorityHandler implements OdlActionHandler {
  readonly action = 'object_authority';
  private readonly logger = new Logger(AuthorityHandler.name);

  constructor(
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly objectAuthorityRepository: ObjectAuthorityRepository,
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

      await this.objectAuthorityRepository.create({
        object_id,
        account: ctx.creator,
        authority_type,
      });
      return;
    }

    if (method === 'remove') {
      await this.objectAuthorityRepository.delete(object_id, ctx.creator, authority_type);
      return;
    }
  }
}
