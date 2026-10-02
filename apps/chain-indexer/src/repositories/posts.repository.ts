import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import { NewPost, Post, PostActiveVote, NewPostActiveVote, NewPostObject, NewPostLink, NewPostMention, NewPostLanguage, NewPostRebloggedUser, PostUpdate } from '@opden-data-layer/odl-db-types';

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

type DbExecutor = Kysely<Database> | Transaction<Database>;

export type HivePayoutFieldUpdate = Pick<
  PostUpdate,
  | 'pending_payout_value'
  | 'total_payout_value'
  | 'curator_payout_value'
  | 'total_pending_payout_value'
  | 'cashout_time'
  | 'last_payout'
  | 'net_rshares'
  | 'total_vote_weight'
>;

@Injectable()
export class PostsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private executor(trx?: DbExecutor): DbExecutor {
    return trx ?? this.db;
  }

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

  /** Idempotent reblog marker; earlier timestamp wins so a later chain replay can heal a bad row. */
  async insertRebloggedUser(row: NewPostRebloggedUser): Promise<void> {
    await this.db
      .insertInto('post_reblogged_users')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink', 'account']).doUpdateSet({
          reblogged_at_unix: sql`LEAST(post_reblogged_users.reblogged_at_unix, excluded.reblogged_at_unix)`,
        }),
      )
      .execute();
  }

  /** Root post only (`depth` 0 or null). */
  async findRootPostByAuthorPermlink(
    author: string,
    permlink: string,
  ): Promise<Post | undefined> {
    return this.db
      .selectFrom('posts')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .where((eb) =>
        eb.or([eb('depth', '=', 0), eb('depth', 'is', null)]),
      )
      .executeTakeFirst();
  }

  /** Root post row lock for WAIV vote updates (caller must run inside a transaction). */
  async findRootPostForUpdate(
    author: string,
    permlink: string,
    trx: Transaction<Database>,
  ): Promise<Post | undefined> {
    return trx
      .selectFrom('posts')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .where((eb) =>
        eb.or([eb('depth', '=', 0), eb('depth', 'is', null)]),
      )
      .forUpdate()
      .executeTakeFirst();
  }

  async applyWaivVoteUpdate(
    params: {
      author: string;
      permlink: string;
      voter: string;
      rsharesWaiv: number;
      weight?: number | null;
      percent?: number | null;
      netRsharesWaiv: number;
      totalPayoutWaiv: number;
      updatePayoutFields: boolean;
    },
    trx?: DbExecutor,
  ): Promise<boolean> {
    const db = this.executor(trx);
    if (!trx) {
      const post = await this.findRootPostByAuthorPermlink(
        params.author,
        params.permlink,
      );
      if (!post) {
        return false;
      }
    }
    if (params.updatePayoutFields) {
      await db
        .updateTable('posts')
        .set({
          net_rshares_waiv: params.netRsharesWaiv,
          total_payout_waiv: params.totalPayoutWaiv,
        })
        .where('author', '=', params.author)
        .where('permlink', '=', params.permlink)
        .execute();
    }
    if (params.rsharesWaiv === 0 && (params.weight ?? 0) === 0) {
      await db
        .deleteFrom('post_active_votes')
        .where('author', '=', params.author)
        .where('permlink', '=', params.permlink)
        .where('voter', '=', params.voter)
        .execute();
      return true;
    }
    await db
      .insertInto('post_active_votes')
      .values({
        author: params.author,
        permlink: params.permlink,
        voter: params.voter,
        weight: params.weight ?? null,
        percent: params.percent ?? null,
        rshares: null,
        rshares_waiv: params.rsharesWaiv,
      })
      .onConflict((oc) =>
        oc.columns(['author', 'permlink', 'voter']).doUpdateSet({
          weight: params.weight ?? null,
          percent: params.percent ?? null,
          rshares_waiv: params.rsharesWaiv,
        }),
      )
      .execute();
    return true;
  }

  async incrementWaivRewards(
    author: string,
    permlink: string,
    delta: number,
    trx?: DbExecutor,
  ): Promise<boolean> {
    const result = await this.executor(trx)
      .updateTable('posts')
      .set({
        total_rewards_waiv: sql`total_rewards_waiv + ${delta}::double precision`,
      })
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .where('rewards_finalized_at', 'is', null)
      .where((eb) =>
        eb.or([eb('depth', '=', 0), eb('depth', 'is', null)]),
      )
      .executeTakeFirst();
    const n = result.numUpdatedRows ?? BigInt(0);
    return Number(n) > 0;
  }

  async updateWaivPayoutFields(
    author: string,
    permlink: string,
    netRsharesWaiv: number,
    totalPayoutWaiv: number,
  ): Promise<void> {
    await this.db
      .updateTable('posts')
      .set({
        net_rshares_waiv: netRsharesWaiv,
        total_payout_waiv: totalPayoutWaiv,
      })
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }

  async updateHivePayoutFields(
    author: string,
    permlink: string,
    fields: HivePayoutFieldUpdate,
  ): Promise<void> {
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    ) as HivePayoutFieldUpdate;
    if (Object.keys(patch).length === 0) {
      return;
    }
    await this.db
      .updateTable('posts')
      .set(patch)
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }

  async upsertWaivVoteRshares(
    author: string,
    permlink: string,
    voter: string,
    rsharesWaiv: number,
  ): Promise<void> {
    await this.db
      .insertInto('post_active_votes')
      .values({
        author,
        permlink,
        voter,
        weight: null,
        percent: null,
        rshares: null,
        rshares_waiv: rsharesWaiv,
      })
      .onConflict((oc) =>
        oc.columns(['author', 'permlink', 'voter']).doUpdateSet({
          rshares_waiv: rsharesWaiv,
        }),
      )
      .execute();
  }

  async findActiveVotes(
    author: string,
    permlink: string,
    trx?: DbExecutor,
  ): Promise<PostActiveVote[]> {
    return this.executor(trx)
      .selectFrom('post_active_votes')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }

  async countOtherActiveUpvotes(
    author: string,
    permlink: string,
    excludeVoter: string,
    trx?: DbExecutor,
  ): Promise<number> {
    const row = await this.executor(trx)
      .selectFrom('post_active_votes')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .where('voter', '!=', excludeVoter)
      .where('percent', '>', 0)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async topExistingUpvoteWeights(
    author: string,
    permlink: string,
    excludeVoter: string,
    limit: number,
    trx?: DbExecutor,
  ): Promise<number[]> {
    if (limit <= 0) {
      return [];
    }
    const rows = await this.executor(trx)
      .selectFrom('post_active_votes')
      .select('weight')
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .where('voter', '!=', excludeVoter)
      .where('percent', '>', 0)
      .orderBy('weight', 'desc')
      .limit(limit)
      .execute();
    return rows.map((row) => row.weight ?? 0);
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

  async appendPostObjects(rows: NewPostObject[], trx?: DbExecutor): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.executor(trx)
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
   * Upsert post row + replace satellites inside an existing transaction.
   */
  async upsertPostWithSatellitesTrx(
    trx: DbExecutor,
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
    const {
      author: _a,
      permlink: _p,
      beneficiaries: _b,
      rewards_finalized_at: _rewardsFinalizedAt,
      ...rest
    } = sanitized;
    void _a;
    void _p;
    void _b;
    void _rewardsFinalizedAt;
    const insertRow = {
      ...sanitized,
      beneficiaries: beneficiariesSql as unknown as NewPost['beneficiaries'],
    };

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
    await this.db.transaction().execute(async (trx) => {
      await this.upsertPostWithSatellitesTrx(trx, row, data);
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
        .select(['voter', 'rshares_waiv'])
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
      for (const row of stored) {
        if (!hiveVoters.has(row.voter)) {
          if ((row.rshares_waiv ?? 0) > 0) {
            continue;
          }
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
