import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
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
} from '@opden-data-layer/core';

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

  /**
   * Insert on conflict update all scalars except PK (full row replace semantics).
   */
  async upsertPost(row: NewPost): Promise<void> {
    const { author: _author, permlink: _permlink, ...rest } = row;
    void _author;
    void _permlink;
    await this.db
      .insertInto('posts')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink']).doUpdateSet({
          ...rest,
        }),
      )
      .execute();
  }

  async incrementChildren(rootAuthor: string, permlink: string): Promise<void> {
    await this.db
      .updateTable('posts')
      .set({ children: sql`children + 1` })
      .where('root_author', '=', rootAuthor)
      .where('permlink', '=', permlink)
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
    const author = row.author;
    const permlink = row.permlink;
    const { author: _a, permlink: _p, ...rest } = row;
    void _a;
    void _p;
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('posts')
        .values(row)
        .onConflict((oc) =>
          oc.columns(['author', 'permlink']).doUpdateSet({ ...rest }),
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
}
