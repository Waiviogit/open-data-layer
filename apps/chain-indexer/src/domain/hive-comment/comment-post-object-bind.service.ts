import { Injectable } from '@nestjs/common';
import type { NewPostObject } from '@opden-data-layer/core';
import { MAX_POST_OBJECTS_PER_POST } from '../../constants/post-objects';
import { isThreadParentAccount } from '../../constants/thread-accounts';
import { ObjectsCoreRepository } from '../../repositories/objects-core.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import { ThreadsRepository } from '../../repositories/threads.repository';
import { extractObjectIdsFromCommentBody } from './comment-post-object-candidates';
import type { CommentOperationPayload } from './hive-comment.schema';
import { PostUpsertService } from './post-upsert.service';

/**
 * Binds `objects_core` objects to a **root post** when a user mentions them in a **comment** body
 * (hashtags + `/object/` paths). Skips thread parents and Leo/Ecency thread rows.
 *
 * @see docs/spec/data-model/post-json-metadata-objects.md
 */
@Injectable()
export class CommentPostObjectBindService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly threadsRepository: ThreadsRepository,
    private readonly postUpsert: PostUpsertService,
  ) {}

  async tryBindObjectsFromComment(
    op: CommentOperationPayload,
    blockTimestamp: string,
  ): Promise<void> {
    const parentAuthor = op.parent_author?.trim();
    const parentPermlink = op.parent_permlink?.trim();
    if (!parentAuthor || !parentPermlink) {
      return;
    }

    if (isThreadParentAccount(parentAuthor)) {
      return;
    }

    const threadRow = await this.threadsRepository.findByKey(
      parentAuthor,
      parentPermlink,
    );
    if (threadRow) {
      return;
    }

    const candidates = extractObjectIdsFromCommentBody(op.body ?? '');
    if (candidates.length === 0) {
      return;
    }

    let post = await this.postsRepository.findByKey(parentAuthor, parentPermlink);
    if (!post) {
      post =
        (await this.postUpsert.ensureRootPostInDb(
          parentAuthor,
          parentPermlink,
          blockTimestamp,
        )) ?? undefined;
    }
    if (!post) {
      return;
    }

    const types = await this.objectsCoreRepository.findObjectTypesByIds(candidates);
    const resolvedIds = candidates.filter((id) => types.has(id));
    if (resolvedIds.length === 0) {
      return;
    }

    const existing = await this.postsRepository.findPostObjectIdsForPost(
      parentAuthor,
      parentPermlink,
    );
    const newIds = resolvedIds.filter((id) => !existing.has(id));
    if (newIds.length === 0) {
      return;
    }

    const remaining = MAX_POST_OBJECTS_PER_POST - existing.size;
    if (remaining <= 0) {
      return;
    }

    const sliced = newIds.slice(0, remaining);
    const rows: NewPostObject[] = sliced.map((object_id) => ({
      author: parentAuthor,
      permlink: parentPermlink,
      object_id,
      percent: 0,
      object_type: types.get(object_id) ?? null,
    }));

    await this.postsRepository.appendPostObjects(rows);
  }
}
