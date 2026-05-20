import { Injectable, Logger } from '@nestjs/common';
import { SocialGraphRepository } from '../../../repositories/social-graph.repository';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { userFollowPayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class FollowUserBellHandler implements OdlActionHandler {
  readonly action = 'user_follow';
  private readonly logger = new Logger(FollowUserBellHandler.name);

  constructor(private readonly socialGraph: SocialGraphRepository) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = userFollowPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid user_follow payload: ${result.error.message}`);
      return;
    }

    const { following, bell } = result.data;
    const exists = await this.socialGraph.subscriptionExists(ctx.creator, following);
    if (!exists) {
      this.logger.warn(
        `user_follow: no subscription for '${ctx.creator}' -> '${following}'; skipping bell`,
      );
      return;
    }

    await this.socialGraph.updateSubscriptionBell(ctx.creator, following, bell);
  }
}
