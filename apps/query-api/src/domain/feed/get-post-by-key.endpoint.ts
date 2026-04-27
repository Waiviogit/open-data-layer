import { Injectable } from '@nestjs/common';
import { HiveClient } from '@opden-data-layer/clients';
import { POST_LINKED_OBJECT_UPDATE_TYPES } from '@opden-data-layer/core';
import type { Post } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  AccountsCurrentRepository,
  PostsRepository,
  type PostVoteSummary,
} from '../../repositories';
import { mapAccountToUserProfileView } from '../users/account-mapper';
import { parsePostingMetadata } from '../users/parse-posting-metadata';
import { GovernanceResolverService } from '../governance';
import { buildLinkedObjectSummaries } from './feed-object-summaries';
import { mapHiveContentToSinglePostView } from './map-hive-content-to-single-post.dto';
import { ObjectProjectionService } from '../object-projection';
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
    private readonly objectProjection: ObjectProjectionService,
    private readonly hiveClient: HiveClient,
  ) {}

  async execute(
    author: string,
    permlink: string,
    locale: string,
    governanceObjectIdFromHeader?: string,
    viewerAccount?: string,
  ): Promise<SinglePostViewDto | null> {
    const key = { author, permlink };
    const [postRows, postObjects, voteMap] = await Promise.all([
      this.postsRepo.findPostsByKeys([key]),
      this.postsRepo.findPostObjectsByKeys([key]),
      this.postsRepo.findActiveVoteSummaries([key], viewerAccount),
    ]);

    const post = postRows[0];
    if (!post) {
      const hiveContent = await this.hiveClient.getContent(author, permlink);
      if (
        !hiveContent ||
        !hiveContent.author?.trim() ||
        !hiveContent.permlink?.trim()
      ) {
        return null;
      }
      if (
        hiveContent.author.trim().toLowerCase() !== author.trim().toLowerCase() ||
        hiveContent.permlink.trim().toLowerCase() !== permlink.trim().toLowerCase()
      ) {
        return null;
      }
      const authorProfile = await this.resolveAuthorProfileForHiveFallback(author);
      return mapHiveContentToSinglePostView(hiveContent, authorProfile, viewerAccount);
    }

    return this.mapPostToSingleView(
      post,
      postObjects,
      voteMap,
      locale,
      governanceObjectIdFromHeader,
      viewerAccount,
    );
  }

  private async resolveAuthorProfileForHiveFallback(
    author: string,
  ): Promise<SinglePostViewDto['authorProfile']> {
    const accountRow = await this.accounts.findByName(author);
    if (accountRow) {
      const profile = mapAccountToUserProfileView(accountRow);
      return {
        name: profile.name,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        reputation: profile.reputation,
      };
    }
    const hiveAccounts = await this.hiveClient.getAccounts([author]);
    const ha = hiveAccounts[0];
    if (!ha) {
      return {
        name: author,
        displayName: null,
        avatarUrl: null,
        reputation: 0,
      };
    }
    const meta = parsePostingMetadata(ha.posting_json_metadata);
    const metaName = meta?.profile.name?.trim() ?? '';
    const displayName = metaName !== '' ? metaName : ha.name;
    const avatarFromMeta = meta?.profile.profile_image?.trim() ?? '';
    const avatarUrl = avatarFromMeta !== '' ? avatarFromMeta : null;
    return {
      name: ha.name,
      displayName,
      avatarUrl,
      reputation: 0,
    };
  }

  private async mapPostToSingleView(
    post: Post,
    postObjects: Awaited<ReturnType<PostsRepository['findPostObjectsByKeys']>>,
    voteMap: Map<string, PostVoteSummary>,
    locale: string,
    governanceObjectIdFromHeader: string | undefined,
    viewerAccount: string | undefined,
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
    const votes = voteMap.get(pk) ?? { totalCount: 0, previewVoters: [], voted: false };

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
        update_types: [...POST_LINKED_OBJECT_UPDATE_TYPES],
        locale,
        include_rejected: false,
        governance,
      });
      viewsByObjectId = new Map(views.map((v, i) => [objects[i].core.object_id, v]));
    }

    const objects = await buildLinkedObjectSummaries(
      objectsForPost,
      viewsByObjectId,
      weightByObjectId,
      this.objectProjection,
      {
        locale,
        governanceObjectIdFromHeader,
        viewerAccount,
      },
    );

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
        voted: votes.voted,
      },
    };
  }
}
