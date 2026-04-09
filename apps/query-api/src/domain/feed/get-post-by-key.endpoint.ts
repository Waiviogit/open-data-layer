import { Injectable } from '@nestjs/common';
import type { Post } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, AccountsCurrentRepository, PostsRepository } from '../../repositories';
import { mapAccountToUserProfileView } from '../users/account-mapper';
import { GovernanceResolverService } from '../governance';
import {
  mapPostObjectsToTaggedRowsWithWeight,
  sortFeedObjectSummaries,
} from './feed-object-summaries';
import { FEED_OBJECT_UPDATE_TYPES } from './feed.constants';
import type { SinglePostViewDto } from './feed-story-dtos';
import { stripHtmlForExcerpt, truncateExcerpt } from './post-excerpt';
import { extractThumbnailUrl } from './post-thumbnail';
import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';
import { isNsfwPost } from './post-nsfw';

@Injectable()
export class GetPostByKeyEndpoint {
  constructor(
    private readonly postsRepo: PostsRepository,
    private readonly accounts: AccountsCurrentRepository,
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceResolver: GovernanceResolverService,
  ) {}

  async execute(
    author: string,
    permlink: string,
    locale: string,
    governanceObjectIdFromHeader?: string,
  ): Promise<SinglePostViewDto | null> {
    const key = { author, permlink };
    const [postRows, postObjects, voteMap] = await Promise.all([
      this.postsRepo.findPostsByKeys([key]),
      this.postsRepo.findPostObjectsByKeys([key]),
      this.postsRepo.findActiveVoteSummaries([key]),
    ]);

    const post = postRows[0];
    if (!post) {
      return null;
    }

    return this.mapPostToSingleView(
      post,
      postObjects,
      voteMap,
      locale,
      governanceObjectIdFromHeader,
    );
  }

  private async mapPostToSingleView(
    post: Post,
    postObjects: Awaited<ReturnType<PostsRepository['findPostObjectsByKeys']>>,
    voteMap: Map<string, { totalCount: number; previewVoters: string[] }>,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
  ): Promise<SinglePostViewDto> {
    const pk = `${post.author}\0${post.permlink}`;
    const accountRow = await this.accounts.findByName(post.author);
    const profile = accountRow ? mapAccountToUserProfileView(accountRow) : null;
    const authorProfile = profile
      ? {
          name: profile.name,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          reputation: profile.reputation,
        }
      : {
          name: post.author,
          displayName: null,
          avatarUrl: null,
          reputation: 0,
        };

    const excerpt = truncateExcerpt(stripHtmlForExcerpt(post.body ?? ''));
    const votes = voteMap.get(pk) ?? { totalCount: 0, previewVoters: [] };

    const objectsForPost = postObjects.filter(
      (o) => o.author === post.author && o.permlink === post.permlink,
    );
    const objectIds = [...new Set(objectsForPost.map((o) => o.object_id))];

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      governanceObjectIdFromHeader,
    );

    let viewsByObjectId = new Map<string, ResolvedObjectView>();
    const weightByObjectId = new Map<string, number | null>();
    if (objectIds.length > 0) {
      const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds(objectIds);
      for (const o of objects) {
        weightByObjectId.set(o.core.object_id, o.core.weight);
      }
      const views = this.objectViewService.resolve(objects, voterReputations, {
        update_types: [...FEED_OBJECT_UPDATE_TYPES],
        locale,
        include_rejected: false,
        governance,
      });
      viewsByObjectId = new Map(views.map((v, i) => [objects[i].core.object_id, v]));
    }

    const withWeight = mapPostObjectsToTaggedRowsWithWeight(
      objectsForPost,
      viewsByObjectId,
      weightByObjectId,
    );
    const objects = sortFeedObjectSummaries(withWeight);

    const createdAt = new Date(post.created_unix * 1000).toISOString();

    return {
      id: `${post.author}/${post.permlink}`,
      author: post.author,
      permlink: post.permlink,
      title: post.title ?? '',
      excerpt,
      body: post.body ?? '',
      createdAt,
      feedAt: createdAt,
      rebloggedBy: null,
      isNsfw: isNsfwPost(post.json_metadata ?? '', post.category),
      category: post.category,
      children: post.children,
      pendingPayout: post.pending_payout_value ?? '',
      totalPayout: post.total_payout_value ?? '',
      netRshares: String(post.net_rshares),
      thumbnailUrl: extractThumbnailUrl(post.json_metadata ?? '', post.body ?? ''),
      videoThumbnailUrl: extractVideoThumbnailUrl(post.json_metadata ?? '', post.body ?? ''),
      videoEmbedUrl: extractVideoEmbedUrl(post.json_metadata ?? '', post.body ?? '', {
        author: post.author,
        permlink: post.permlink,
      }),
      authorProfile,
      objects,
      votes: {
        totalCount: votes.totalCount,
        previewVoters: votes.previewVoters,
      },
    };
  }
}
