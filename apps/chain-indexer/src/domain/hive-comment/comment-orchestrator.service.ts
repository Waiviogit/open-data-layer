import { Injectable, Logger } from '@nestjs/common';
import { PostsRepository } from '../../repositories/posts.repository';
import { ThreadsRepository } from '../../repositories/threads.repository';
import { isThreadParentAccount } from '../../constants/thread-accounts';
import {
  commentOperationPayloadSchema,
  deleteCommentOperationPayloadSchema,
} from './hive-comment.schema';
import { isTruthyMetadata, parseJsonMetadata } from './json-metadata.util';
import { PostUpsertService } from './post-upsert.service';
import { ThreadParseService } from './thread-parse.service';

@Injectable()
export class CommentOperationOrchestrator {
  private readonly logger = new Logger(CommentOperationOrchestrator.name);

  constructor(
    private readonly postUpsert: PostUpsertService,
    private readonly threadParse: ThreadParseService,
    private readonly postsRepository: PostsRepository,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async handleComment(
    payload: unknown,
    blockTimestamp: string,
  ): Promise<void> {
    const parsed = commentOperationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn(`Invalid comment payload: ${parsed.error.message}`);
      return;
    }
    const op = parsed.data;
    const metadata = parseJsonMetadata(op.json_metadata);

    if (op.parent_author === '' && isTruthyMetadata(metadata)) {
      await this.postUpsert.upsertRootPost(op, metadata, blockTimestamp);
    }

    if (op.parent_author && op.parent_permlink) {
      if (isThreadParentAccount(op.parent_author)) {
        await this.threadParse.parseThread(op, {
          blockTimestamp,
        });
      } else {
        await this.threadParse.parseThreadReply(op);
      }
      await this.postsRepository.incrementChildren(
        op.parent_author,
        op.parent_permlink,
      );
    }
  }

  /**
   * @returns true when post was deleted from DB (campaign queue step skipped → differs from legacy).
   */
  async handleDeleteComment(payload: unknown): Promise<boolean> {
    const raw = payload as Record<string, unknown> | null | undefined;
    const author = typeof raw?.author === 'string' ? raw.author : '';
    const permlink = typeof raw?.permlink === 'string' ? raw.permlink : '';

    await this.threadsRepository.softDelete(author, permlink);

    const parsed = deleteCommentOperationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return false;
    }

    const deleted = await this.postsRepository.deleteOne(
      parsed.data.author,
      parsed.data.permlink,
    );
    return deleted !== undefined;
  }
}
