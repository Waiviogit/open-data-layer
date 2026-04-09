import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  HiveBeneficiary,
  JsonValue,
  Post,
  UserPostDraft,
  UserPostDraftUpdate,
} from '@opden-data-layer/core';
import { PostsRepository } from '../../repositories/posts.repository';
import { UserPostDraftsRepository } from '../../repositories/user-post-drafts.repository';
import {
  decodeDraftListCursor,
  encodeDraftListCursor,
  type DraftListCursorPayload,
} from './drafts-cursor';
import { DRAFT_LIST_MAX_LIMIT } from './drafts.constants';
import { normalizeBeneficiariesForDb } from './normalize-beneficiaries';
import { parsePostJsonMetadataString } from './parse-post-json-metadata';
import type {
  BulkDeleteUserPostDraftsBody,
  CreateUserPostDraftBody,
  GetDraftsQuery,
  PatchUserPostDraftBody,
} from './user-post-drafts.schemas';
import { parseListLimit } from './user-post-drafts.schemas';

export interface UserPostDraftView {
  draftId: string;
  author: string;
  title: string;
  body: string;
  jsonMetadata: JsonValue;
  parentAuthor: string;
  parentPermlink: string;
  permlink: string | null;
  beneficiaries: HiveBeneficiary[];
  lastUpdated: number;
}

export interface UserPostDraftListResponse {
  items: UserPostDraftView[];
  cursor: string | null;
  hasMore: boolean;
}

export interface BulkDeleteUserPostDraftsResult {
  /** Number of rows deleted (may be less than `draftIds.length` if some ids did not exist). */
  deleted: number;
}

@Injectable()
export class UserPostDraftsService {
  private readonly logger = new Logger(UserPostDraftsService.name);

  constructor(
    private readonly drafts: UserPostDraftsRepository,
    private readonly posts: PostsRepository,
  ) {}

  toView(row: UserPostDraft): UserPostDraftView {
    return {
      draftId: row.draft_id,
      author: row.author,
      title: row.title,
      body: row.body,
      jsonMetadata: row.json_metadata,
      parentAuthor: row.parent_author,
      parentPermlink: row.parent_permlink,
      permlink: row.permlink,
      beneficiaries: row.beneficiaries,
      lastUpdated: row.last_updated,
    };
  }

  async getList(
    author: string,
    query: GetDraftsQuery,
  ): Promise<UserPostDraftListResponse> {
    const limit = Math.min(
      parseListLimit(query),
      DRAFT_LIST_MAX_LIMIT,
    );
    const limitPlusOne = limit + 1;
    let cursorPayload: DraftListCursorPayload | null = null;
    if (query.cursor) {
      cursorPayload = decodeDraftListCursor(query.cursor);
      if (!cursorPayload) {
        return {
          items: [],
          cursor: null,
          hasMore: false,
        };
      }
    }
    const rows = await this.drafts.listByAuthorKeyset(
      author,
      cursorPayload,
      limitPlusOne,
    );
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const cursor =
      hasMore && last
        ? encodeDraftListCursor({
            lastUpdated: last.last_updated,
            draftId: last.draft_id,
          })
        : null;
    return {
      items: page.map((r) => this.toView(r)),
      cursor,
      hasMore,
    };
  }

  async getOne(
    author: string,
    draftId: string | undefined,
    permlink: string | undefined,
  ): Promise<UserPostDraftView> {
    const row = await this.resolveRow(author, draftId, permlink);
    return this.toView(row);
  }

  async create(
    author: string,
    body: CreateUserPostDraftBody,
  ): Promise<UserPostDraftView> {
    const now = Date.now();
    const draftId = randomUUID();
    const jsonMetadata = asJsonMetadata(body.jsonMetadata);
    const beneficiaries = normalizeBeneficiariesForDb(body.beneficiaries ?? []);
    const row = await this.drafts.insert({
      author,
      draft_id: draftId,
      title: body.title,
      body: body.body,
      json_metadata: jsonMetadata,
      parent_author: body.parentAuthor,
      parent_permlink: body.parentPermlink,
      permlink: body.permlink ?? null,
      beneficiaries,
      last_updated: now,
    });
    return this.toView(row);
  }

  async patch(
    author: string,
    draftId: string | undefined,
    permlink: string | undefined,
    body: PatchUserPostDraftBody,
  ): Promise<UserPostDraftView> {
    const existing = await this.resolveRow(author, draftId, permlink);
    const now = Date.now();
    const patch: UserPostDraftUpdate = { last_updated: now };
    if (body.title !== undefined) patch.title = body.title;
    if (body.body !== undefined) patch.body = body.body;
    if (body.jsonMetadata !== undefined) {
      patch.json_metadata = asJsonMetadata(body.jsonMetadata);
    }
    if (body.parentAuthor !== undefined) patch.parent_author = body.parentAuthor;
    if (body.parentPermlink !== undefined) {
      patch.parent_permlink = body.parentPermlink;
    }
    if (body.permlink !== undefined) patch.permlink = body.permlink;
    if (body.beneficiaries !== undefined) {
      patch.beneficiaries = normalizeBeneficiariesForDb(body.beneficiaries);
    }
    const updated = await this.drafts.updateByAuthorAndDraftId(
      author,
      existing.draft_id,
      patch,
    );
    if (!updated) {
      this.logger.error(`Draft disappeared during patch: ${author}/${existing.draft_id}`);
      throw new NotFoundException();
    }
    return this.toView(updated);
  }

  async delete(
    author: string,
    draftId: string | undefined,
    permlink: string | undefined,
  ): Promise<void> {
    const existing = await this.resolveRow(author, draftId, permlink);
    const ok = await this.drafts.deleteByAuthorAndDraftId(
      author,
      existing.draft_id,
    );
    if (!ok) {
      throw new NotFoundException();
    }
  }

  async deleteMany(
    author: string,
    body: BulkDeleteUserPostDraftsBody,
  ): Promise<BulkDeleteUserPostDraftsResult> {
    const deleted = await this.drafts.deleteByAuthorAndDraftIds(
      author,
      body.draftIds,
    );
    return { deleted };
  }

  private async resolveRow(
    author: string,
    draftId: string | undefined,
    permlink: string | undefined,
  ): Promise<UserPostDraft> {
    if (draftId) {
      const row = await this.drafts.findByAuthorAndDraftId(author, draftId);
      if (!row) {
        throw new NotFoundException();
      }
      return row;
    }
    if (permlink) {
      const byPerm = await this.drafts.findByAuthorAndPermlink(
        author,
        permlink,
      );
      if (byPerm) {
        return byPerm;
      }
      const posts = await this.posts.findPostsByKeys([{ author, permlink }]);
      const post = posts[0];
      if (!post) {
        throw new NotFoundException();
      }
      return this.insertDraftFromPost(author, post);
    }
    throw new NotFoundException();
  }

  private async insertDraftFromPost(
    author: string,
    post: Post,
  ): Promise<UserPostDraft> {
    const now = Date.now();
    const draftId = randomUUID();
    return this.drafts.insert({
      author,
      draft_id: draftId,
      title: post.title,
      body: post.body,
      json_metadata: parsePostJsonMetadataString(post.json_metadata),
      parent_author: post.parent_author,
      parent_permlink: post.parent_permlink,
      permlink: post.permlink,
      beneficiaries: normalizeBeneficiariesForDb(post.beneficiaries),
      last_updated: now,
    });
  }
}

function asJsonMetadata(v: unknown): JsonValue {
  if (v === undefined) {
    return {};
  }
  if (v === null || typeof v !== 'object') {
    return {};
  }
  return v as JsonValue;
}

