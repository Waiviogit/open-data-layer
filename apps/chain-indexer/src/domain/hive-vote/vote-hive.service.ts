import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../../database';
import { KYSELY } from '../../database';
import { PostSyncQueueRepository } from '../../repositories/post-sync-queue.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import { blockTimestampToUnixSeconds } from '../hive-comment/hive-datetime.util';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import { voteOperationSchema } from './vote-hive.schema';

@Injectable()
export class VoteHiveService {
  private readonly logger = new Logger(VoteHiveService.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly postsRepository: PostsRepository,
    private readonly postSyncQueueRepository: PostSyncQueueRepository,
  ) {}

  async handleVote(
    payload: Record<string, unknown>,
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    const parsed = voteOperationSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid vote payload: ${parsed.error.message}`);
      return;
    }
    const { voter, author, permlink, weight } = parsed.data;
    const enqueuedAt = blockTimestampToUnixSeconds(context.timestamp);

    await this.db.transaction().execute(async (trx) => {
      const postExists = await this.postsRepository.applyChainVoteIfPostExists(
        trx,
        author,
        permlink,
        voter,
        weight,
      );

      await this.postSyncQueueRepository.enqueue(
        author,
        permlink,
        enqueuedAt,
        !postExists,
        trx,
      );
    });
  }
}
