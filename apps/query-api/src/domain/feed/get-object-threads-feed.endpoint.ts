import { Injectable } from '@nestjs/common';
import {
  AccountsCurrentRepository,
  ObjectsCoreRepository,
  ThreadsRepository,
  UserAccountMutesRepository,
} from '../../repositories';
import { decodeFeedCursor } from './feed-cursor';
import type { UserBlogFeedResponse } from './feed-story-dtos';
import type { ObjectThreadsFeedBody } from './schemas/object-threads-feed.schema';
import { hydrateThreadFeedPage } from './thread-feed-hydrator';
import { GovernanceResolverService } from '../governance';
import { resolveActivityAuthorsAllowlist } from '../governance/resolve-activity-authors-allowlist';

@Injectable()
export class GetObjectThreadsFeedEndpoint {
  constructor(
    private readonly threadsRepo: ThreadsRepository,
    private readonly objectsCoreRepo: ObjectsCoreRepository,
    private readonly accounts: AccountsCurrentRepository,
    private readonly userAccountMutesRepo: UserAccountMutesRepository,
    private readonly governanceResolver: GovernanceResolverService,
  ) {}

  async execute(
    objectId: string,
    body: ObjectThreadsFeedBody,
    viewerAccount?: string,
    governanceObjectIdFromHeader?: string,
  ): Promise<UserBlogFeedResponse | null> {
    const trimmedId = objectId.trim();
    if (!trimmedId) {
      return null;
    }

    const core = await this.objectsCoreRepo.findByObjectIdForPage(trimmedId);
    if (!core) {
      return null;
    }

    const limit = body.limit;
    const limitPlusOne = limit + 1;
    const cursorPayload = body.cursor ? decodeFeedCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const viewerTrimmed = viewerAccount?.trim() ?? '';
    const mutedAuthors =
      viewerTrimmed.length > 0
        ? await this.userAccountMutesRepo.listMutedForMuters([viewerTrimmed])
        : [];

    const includedAuthors = await resolveActivityAuthorsAllowlist(this.governanceResolver, {
      authorsOnly: body.authors_only,
      governanceObjectIdFromHeader,
      authorsGovernanceObjectId: body.authors_governance_object_id,
    });
    if (includedAuthors && includedAuthors.length === 0) {
      return {
        items: [],
        cursor: null,
        hasMore: false,
      };
    }

    const threadRows = await this.threadsRepo.findObjectThreadsFeed(
      trimmedId,
      mutedAuthors,
      cursorPayload,
      body.sort,
      limitPlusOne,
      includedAuthors,
    );

    return hydrateThreadFeedPage(
      { threadsRepo: this.threadsRepo, accounts: this.accounts },
      threadRows,
      limit,
      viewerAccount,
    );
  }
}
