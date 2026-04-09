import { Injectable, Inject } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  NewUserPostDraft,
  UserPostDraft,
  UserPostDraftUpdate,
} from '@opden-data-layer/core';
import { normalizeBeneficiariesForDb } from '../domain/drafts/normalize-beneficiaries';

function jsonMetadataForJsonb(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

@Injectable()
export class UserPostDraftsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByAuthorAndDraftId(
    author: string,
    draftId: string,
  ): Promise<UserPostDraft | null> {
    const row = await this.db
      .selectFrom('user_post_drafts')
      .selectAll()
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .executeTakeFirst();
    return row ?? null;
  }

  async findByAuthorAndPermlink(
    author: string,
    permlink: string,
  ): Promise<UserPostDraft | null> {
    const row = await this.db
      .selectFrom('user_post_drafts')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
    return row ?? null;
  }

  async insert(row: NewUserPostDraft): Promise<UserPostDraft> {
    const inserted = await this.db
      .insertInto('user_post_drafts')
      .values({
        ...row,
        // Bind JSONB as text cast (see chain-indexer object-updates.repository) so pg
        // never receives driver-shaped values that stringify to invalid JSON.
        json_metadata: sql`${JSON.stringify(jsonMetadataForJsonb(row.json_metadata))}::jsonb`,
        beneficiaries: sql`${JSON.stringify(
          normalizeBeneficiariesForDb(row.beneficiaries),
        )}::jsonb`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return inserted;
  }

  async updateByAuthorAndDraftId(
    author: string,
    draftId: string,
    patch: UserPostDraftUpdate,
  ): Promise<UserPostDraft | null> {
    const {
      beneficiaries: patchBeneficiaries,
      json_metadata: patchJsonMetadata,
      ...scalarPatch
    } = patch;

    const setValues: Record<string, unknown> = Object.fromEntries(
      Object.entries(scalarPatch).filter(([, v]) => v !== undefined),
    );

    if (patchBeneficiaries !== undefined) {
      setValues.beneficiaries = sql`${JSON.stringify(
        normalizeBeneficiariesForDb(patchBeneficiaries),
      )}::jsonb`;
    }
    if (patchJsonMetadata !== undefined) {
      setValues.json_metadata = sql`${JSON.stringify(
        jsonMetadataForJsonb(patchJsonMetadata),
      )}::jsonb`;
    }

    if (Object.keys(setValues).length === 0) {
      return this.findByAuthorAndDraftId(author, draftId);
    }

    const updated = await this.db
      .updateTable('user_post_drafts')
      .set(setValues as UserPostDraftUpdate)
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .returningAll()
      .executeTakeFirst();
    return updated ?? null;
  }

  async deleteByAuthorAndDraftId(
    author: string,
    draftId: string,
  ): Promise<boolean> {
    const result = await this.db
      .deleteFrom('user_post_drafts')
      .where('author', '=', author)
      .where('draft_id', '=', draftId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Deletes all drafts for `author` whose `draft_id` is in `draftIds`.
   * Unknown ids are ignored; returns how many rows were deleted.
   */
  async deleteByAuthorAndDraftIds(
    author: string,
    draftIds: readonly string[],
  ): Promise<number> {
    if (draftIds.length === 0) {
      return 0;
    }
    const result = await this.db
      .deleteFrom('user_post_drafts')
      .where('author', '=', author)
      .where('draft_id', 'in', [...draftIds])
      .executeTakeFirst();
    return Number(result.numDeletedRows);
  }

  async listByAuthorKeyset(
    author: string,
    cursor: { lastUpdated: number; draftId: string } | null,
    limitPlusOne: number,
  ): Promise<UserPostDraft[]> {
    let qb = this.db
      .selectFrom('user_post_drafts')
      .selectAll()
      .where('author', '=', author)
      .orderBy('last_updated', 'desc')
      .orderBy('draft_id', 'desc');

    if (cursor) {
      qb = qb.where((eb) =>
        eb.or([
          eb('last_updated', '<', cursor.lastUpdated),
          eb.and([
            eb('last_updated', '=', cursor.lastUpdated),
            eb('draft_id', '<', cursor.draftId),
          ]),
        ]),
      );
    }

    return qb.limit(limitPlusOne).execute();
  }
}
