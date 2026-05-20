import { Injectable, Logger } from '@nestjs/common';
import { ObjectsCoreRepository, UserObjectFollowsRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { objectFollowPayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class FollowObjectHandler implements OdlActionHandler {
  readonly action = 'object_follow';
  private readonly logger = new Logger(FollowObjectHandler.name);

  constructor(
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly userObjectFollowsRepository: UserObjectFollowsRepository,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = objectFollowPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid object_follow payload: ${result.error.message}`);
      return;
    }

    const { object_id, method } = result.data;

    if (method === 'follow') {
      const object = await this.objectsCoreRepository.findByObjectId(object_id);
      if (!object) {
        this.logger.warn(
          `object_follow: object '${object_id}' not found; skipping (method: follow)`,
        );
        return;
      }

      await this.userObjectFollowsRepository.upsert({
        account: ctx.creator,
        object_id,
        bell: false,
        created_at: new Date(ctx.timestamp),
      });
      return;
    }

    if (method === 'unfollow') {
      await this.userObjectFollowsRepository.delete(ctx.creator, object_id);
      return;
    }

    if (method === 'bell') {
      const bell = result.data.bell;
      if (bell === undefined) {
        return;
      }
      const existing = await this.userObjectFollowsRepository.findByAccountAndObject(
        ctx.creator,
        object_id,
      );
      if (!existing) {
        this.logger.warn(
          `object_follow: no follow row for '${ctx.creator}' on '${object_id}'; skipping bell`,
        );
        return;
      }
      await this.userObjectFollowsRepository.updateBell(ctx.creator, object_id, bell);
    }
  }
}
