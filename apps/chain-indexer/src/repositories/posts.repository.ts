import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  NewPost,
  Post,
  PostActiveVote,
  NewPostActiveVote,
  NewPostObject,
  NewPostLink,
  NewPostMention,
  NewPostLanguage,
  NewPostRebloggedUser,
} from '@opden-data-layer/core';
import type { ActiveVotesType } from '@opden-data-layer/clients';
import { sanitizePostRowJsonColumnsForDatabase } from '../domain/hive-comment/hive-post-normalize.util';

/**
 * JSONB must be valid JSON at the Postgres parser. Bind a single text parameter cast to jsonb
 * so we never rely on driver-specific serialization of JS objects/arrays.
 */
function jsonbParamFromEncodedJson(encodedJson: string) {
  return sql`${encodedJson}::jsonb`;
}

function encodeBeneficiariesForPostgresJsonb(
  beneficiaries: NewPost['beneficiaries'],
): string {
  const plain = (beneficiaries ?? []).map((b) => ({
    account: String(b.account ?? '').replace(/\u0000/g, ''),
    weight: Number.isFinite(b.weight) ? Math.trunc(b.weight) : 0,
  }));
  return JSON.stringify(plain);
}

function toBigIntVoteRshares(v: number | string | undefined | null): bigint {
  if (v === undefined || v === null) {
    return BigInt(0);
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    return BigInt(0);
  }
  return BigInt(Math.trunc(n));
}

@Injectable()
export class PostsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByKey(author: string, permlink: string): Promise<Post | undefined> {
    return this.db
      .selectFrom('posts')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
  }

  /**
   * When a post row exists, upserts or removes a `post_active_votes` row for a chain `vote` op.
   * @returns `true` if `posts` had a matching row, else `false` (no vote rows written).
   */
  async applyChainVoteIfPostExists(
    trx: Transaction<Database>,
    author: string,
    permlink: string,
    voter: string,
    weight: number,
  ): Promise<boolean> {
    const postRow = await trx
      .selectFrom('posts')
      .select('author')
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
    if (postRow === undefined) {
      return false;
    }
    if (weight === 0) {
      await trx
        .deleteFrom('post_active_votes')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .where('voter', '=', voter)
        .execute();
    } else {
      const percent = weight / 100;
      await trx
        .insertInto('post_active_votes')
        .values({
          author,
          permlink,
          voter,
          weight,
          percent,
          rshares: null,
          rshares_waiv: null,
        })
        .onConflict((oc) =>
          oc.columns(['author', 'permlink', 'voter']).doUpdateSet({
            weight,
            percent,
          }),
        )
        .execute();
    }
    return true;
  }

  /**
   * Reblog source resolution: exact author+permlink first, else root post with same permlink (Hive/Waivio parity).
   */
  async findSourcePostForReblog(
    author: string,
    permlink: string,
  ): Promise<Post | undefined> {
    const direct = await this.db
      .selectFrom('posts')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
    if (direct) {
      return direct;
    }
    return this.db
      .selectFrom('posts')
      .selectAll()
      .where('root_author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
  }

  /** Idempotent reblog marker; first timestamp wins. */
  async insertRebloggedUser(row: NewPostRebloggedUser): Promise<void> {
    await this.db
      .insertInto('post_reblogged_users')
      .values(row)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'account']).doNothing())
      .execute();
  }

  async findActiveVotes(
    author: string,
    permlink: string,
  ): Promise<PostActiveVote[]> {
    return this.db
      .selectFrom('post_active_votes')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }

  /** Distinct `object_id` values already linked to the post. */
  async findPostObjectIdsForPost(
    author: string,
    permlink: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .selectFrom('post_objects')
      .select('object_id')
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
    return new Set(rows.map((r) => r.object_id));
  }

  /** Append-only; ignores duplicates (natural PK). */
  /** Distinct authors that linked `object_id` in any post (`post_objects`). */
  async findDistinctAuthorsByLinkedObject(objectId: string): Promise<string[]> {
    const id = objectId.trim();
    if (id.length === 0) {
      return [];
    }
    const rows = await this.db
      .selectFrom('post_objects')
      .select('author')
      .distinct()
      .where('object_id', '=', id)
      .execute();
    return rows.map((r) => r.author);
  }

  async appendPostObjects(rows: NewPostObject[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.db
      .insertInto('post_objects')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink', 'object_id']).doNothing(),
      )
      .execute();
  }

  /**
   * Insert on conflict update all scalars except PK (full row replace semantics).
   */
  async upsertPost(row: NewPost): Promise<void> {
    const sanitized = sanitizePostRowJsonColumnsForDatabase(row);
    const benEncoded = encodeBeneficiariesForPostgresJsonb(sanitized.beneficiaries);
    const beneficiariesSql = jsonbParamFromEncodedJson(benEncoded);
    const { author: _author, permlink: _permlink, beneficiaries: _b, ...rest } = sanitized;
    void _author;
    void _permlink;
    void _b;
    const insertRow = {
      ...sanitized,
      beneficiaries: beneficiariesSql as unknown as NewPost['beneficiaries'],
    };
    await this.db
      .insertInto('posts')
      .values(insertRow)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink']).doUpdateSet({
          ...rest,
          beneficiaries: beneficiariesSql as unknown as NewPost['beneficiaries'],
        }),
      )
      .execute();
  }

  /** Bump `children` on the parent post row; PK is `(author, permlink)`. */
  async incrementChildren(parentAuthor: string, parentPermlink: string): Promise<void> {
    await this.db
      .updateTable('posts')
      .set({ children: sql`children + 1` })
      .where('author', '=', parentAuthor)
      .where('permlink', '=', parentPermlink)
      .execute();
  }

  /** CASCADE removes satellites. Returns deleted post row or undefined. */
  async deleteOne(author: string, permlink: string): Promise<Post | undefined> {
    return this.db
      .deleteFrom('posts')
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Single transaction: upsert post row + replace satellites.
   */
  async upsertPostWithSatellites(
    row: NewPost,
    data: {
      objects: NewPostObject[];
      links: string[];
      mentions: string[];
      languages: string[];
      votes: NewPostActiveVote[];
    },
  ): Promise<void> {
    const sanitized = sanitizePostRowJsonColumnsForDatabase(row);
    const author = sanitized.author;
    const permlink = sanitized.permlink;
    const benEncoded = encodeBeneficiariesForPostgresJsonb(sanitized.beneficiaries);
    const beneficiariesSql = jsonbParamFromEncodedJson(benEncoded);
    const { author: _a, permlink: _p, beneficiaries: _b, ...rest } = sanitized;
    void _a;
    void _p;
    void _b;
    const insertRow = {
      ...sanitized,
      beneficiaries: beneficiariesSql as unknown as NewPost['beneficiaries'],
    };
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('posts')
        .values(insertRow)
        .onConflict((oc) =>
          oc.columns(['author', 'permlink']).doUpdateSet({
            ...rest,
            beneficiaries: beneficiariesSql as unknown as NewPost['beneficiaries'],
          }),
        )
        .execute();

      await trx
        .deleteFrom('post_objects')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      await trx
        .deleteFrom('post_links')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      await trx
        .deleteFrom('post_mentions')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      await trx
        .deleteFrom('post_languages')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      await trx
        .deleteFrom('post_active_votes')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      if (data.objects.length > 0) {
        await trx.insertInto('post_objects').values(data.objects).execute();
      }
      if (data.links.length > 0) {
        const linkRows: NewPostLink[] = data.links.map((url) => ({
          author,
          permlink,
          url,
        }));
        await trx.insertInto('post_links').values(linkRows).execute();
      }
      if (data.mentions.length > 0) {
        const mentionRows: NewPostMention[] = data.mentions.map((account) => ({
          author,
          permlink,
          account,
        }));
        await trx.insertInto('post_mentions').values(mentionRows).execute();
      }
      if (data.languages.length > 0) {
        const langRows: NewPostLanguage[] = data.languages.map((language) => ({
          author,
          permlink,
          language,
        }));
        await trx.insertInto('post_languages').values(langRows).execute();
      }
      if (data.votes.length > 0) {
        await trx.insertInto('post_active_votes').values(data.votes).execute();
      }
    });
  }

  async replacePostSatellites(
    author: string,
    permlink: string,
    data: {
      objects: NewPostObject[];
      links: string[];
      mentions: string[];
      languages: string[];
      votes: NewPostActiveVote[];
    },
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('post_objects')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      await trx
        .deleteFrom('post_links')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      await trx
        .deleteFrom('post_mentions')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      await trx
        .deleteFrom('post_languages')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      await trx
        .deleteFrom('post_active_votes')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();

      if (data.objects.length > 0) {
        await trx.insertInto('post_objects').values(data.objects).execute();
      }
      if (data.links.length > 0) {
        const linkRows: NewPostLink[] = data.links.map((url) => ({
          author,
          permlink,
          url,
        }));
        await trx.insertInto('post_links').values(linkRows).execute();
      }
      if (data.mentions.length > 0) {
        const mentionRows: NewPostMention[] = data.mentions.map((account) => ({
          author,
          permlink,
          account,
        }));
        await trx.insertInto('post_mentions').values(mentionRows).execute();
      }
      if (data.languages.length > 0) {
        const langRows: NewPostLanguage[] = data.languages.map((language) => ({
          author,
          permlink,
          language,
        }));
        await trx.insertInto('post_languages').values(langRows).execute();
      }
      if (data.votes.length > 0) {
        await trx.insertInto('post_active_votes').values(data.votes).execute();
      }
    });
  }

  /**
   * Reconciles `post_active_votes` with Hive `get_active_votes` (authoritative voters + rshares).
   */
  async syncActiveVotesFromHive(
    author: string,
    permlink: string,
    hiveVotes: ActiveVotesType[],
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const hiveVoters = new Set(hiveVotes.map((v) => v.voter));
      const stored = await trx
        .selectFrom('post_active_votes')
        .select('voter')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      for (const row of stored) {
        if (!hiveVoters.has(row.voter)) {
          await trx
            .deleteFrom('post_active_votes')
            .where('author', '=', author)
            .where('permlink', '=', permlink)
            .where('voter', '=', row.voter)
            .execute();
        }
      }
      for (const v of hiveVotes) {
        const rshares = toBigIntVoteRshares(v.rshares);
        const weight = Number.isFinite(v.weight)
          ? v.weight
          : Math.round(Number(rshares) * 1e-6);
        await trx
          .insertInto('post_active_votes')
          .values({
            author,
            permlink,
            voter: v.voter,
            weight,
            percent: v.percent ?? null,
            rshares,
            rshares_waiv: null,
          })
          .onConflict((oc) =>
            oc.columns(['author', 'permlink', 'voter']).doUpdateSet({
              weight,
              percent: v.percent ?? null,
              rshares,
            }),
          )
          .execute();
      }
    });
  }
}
