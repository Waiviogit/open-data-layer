import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { Channel, ChannelMember, Message } from '@opden-data-layer/odl-db-types';

import type { Database } from '../database';
import { KYSELY } from '../database';
import type { ChannelCursorPayload, MessageCursorPayload } from '../domain/messaging/message-feed-cursor';

export type ObjectActivityMessageRow = Message & {
  channel_object_id: string | null;
  duplicate_count: number;
};

export type ActivityDedupCandidateRow = {
  message_id: string;
  dup_group_id: string;
  text_simhash: bigint | null;
  image_phashes: bigint[];
  sort_time_unix: number;
  event_seq: bigint;
  source_platform: string | null;
  source_id: string | null;
  author: string;
  body: string | null;
};

@Injectable()
export class MessagingRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async listViewerChannels(
    viewer: string,
    kind: string | undefined,
    cursor: ChannelCursorPayload | null,
    limitPlusOne: number,
  ): Promise<Channel[]> {
    let query = this.db
      .selectFrom('channels')
      .innerJoin('channel_members', 'channel_members.channel_id', 'channels.channel_id')
      .selectAll('channels')
      .where('channel_members.account', '=', viewer)
      .where('channels.dissolved_at_unix', 'is', null)
      .orderBy('channels.last_message_at_unix', 'desc')
      .orderBy('channels.channel_id', 'desc')
      .limit(limitPlusOne);

    if (kind) {
      query = query.where('channels.kind', '=', kind);
    }

    if (cursor) {
      query = query.where((eb) =>
        eb.or([
          eb('channels.last_message_at_unix', '<', cursor.lastMessageAtUnix),
          eb.and([
            eb('channels.last_message_at_unix', '=', cursor.lastMessageAtUnix),
            eb('channels.channel_id', '<', cursor.channelId),
          ]),
        ]),
      );
    }

    return query.execute();
  }

  async findChannelById(channelId: string): Promise<Channel | undefined> {
    return this.db
      .selectFrom('channels')
      .selectAll()
      .where('channel_id', '=', channelId)
      .executeTakeFirst();
  }

  async findChannelByAlias(alias: string): Promise<Channel | undefined> {
    const row = await this.db
      .selectFrom('channel_aliases')
      .innerJoin('channels', 'channels.channel_id', 'channel_aliases.channel_id')
      .selectAll('channels')
      .where('channel_aliases.alias', '=', alias)
      .executeTakeFirst();
    return row;
  }

  async findById(messageId: string): Promise<Message | undefined> {
    return this.db
      .selectFrom('messages')
      .selectAll()
      .where('message_id', '=', messageId)
      .executeTakeFirst();
  }

  async findObjectChannel(objectId: string): Promise<Channel | undefined> {
    return this.db
      .selectFrom('channels')
      .selectAll()
      .where('object_id', '=', objectId)
      .where('kind', '=', 'object')
      .executeTakeFirst();
  }

  async listMembers(channelId: string): Promise<ChannelMember[]> {
    return this.db
      .selectFrom('channel_members')
      .selectAll()
      .where('channel_id', '=', channelId)
      .orderBy('joined_at_unix', 'asc')
      .execute();
  }

  async isMember(channelId: string, account: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('channel_members')
      .select('account')
      .where('channel_id', '=', channelId)
      .where('account', '=', account)
      .executeTakeFirst();
    return row !== undefined;
  }

  async countMembers(channelId: string): Promise<number> {
    const row = await this.db
      .selectFrom('channel_members')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('channel_id', '=', channelId)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async getMemberRole(channelId: string, account: string): Promise<string | undefined> {
    const row = await this.db
      .selectFrom('channel_members')
      .select('role')
      .where('channel_id', '=', channelId)
      .where('account', '=', account)
      .executeTakeFirst();
    return row?.role;
  }

  async getMemberLastReadAt(
    channelId: string,
    account: string,
  ): Promise<number | null> {
    const row = await this.db
      .selectFrom('channel_members')
      .select('last_read_at_unix')
      .where('channel_id', '=', channelId)
      .where('account', '=', account)
      .executeTakeFirst();
    return row?.last_read_at_unix ?? null;
  }

  async countTotalUnreadForViewer(viewer: string): Promise<number> {
    const viewerTrimmed = viewer.trim();
    if (viewerTrimmed.length === 0) {
      return 0;
    }

    const row = await this.db
      .selectFrom('messages')
      .innerJoin('channel_members', 'channel_members.channel_id', 'messages.channel_id')
      .innerJoin('channels', 'channels.channel_id', 'messages.channel_id')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('channel_members.account', '=', viewerTrimmed)
      .where('channels.dissolved_at_unix', 'is', null)
      .where('messages.author', '!=', viewerTrimmed)
      .where((eb) =>
        eb.or([
          eb('channel_members.last_read_at_unix', 'is', null),
          eb(
            'messages.created_at_unix',
            '>',
            eb.ref('channel_members.last_read_at_unix'),
          ),
        ]),
      )
      .executeTakeFirst();

    return Number(row?.count ?? 0);
  }

  async countUnreadMessages(
    channelId: string,
    viewer: string,
    lastReadAtUnix: number | null,
  ): Promise<number> {
    let query = this.db
      .selectFrom('messages')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('channel_id', '=', channelId)
      .where('author', '!=', viewer);

    if (lastReadAtUnix !== null) {
      query = query.where('created_at_unix', '>', lastReadAtUnix);
    }

    const row = await query.executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async setLastReadAt(
    channelId: string,
    account: string,
    lastReadAtUnix: number,
  ): Promise<boolean> {
    const result = await this.db
      .updateTable('channel_members')
      .set({ last_read_at_unix: lastReadAtUnix })
      .where('channel_id', '=', channelId)
      .where('account', '=', account)
      .where((eb) =>
        eb.or([
          eb('last_read_at_unix', 'is', null),
          eb('last_read_at_unix', '<', lastReadAtUnix),
        ]),
      )
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  async getLastMessagePreview(channelId: string): Promise<{
    preview: string | null;
    encrypted: boolean;
  }> {
    const row = await this.db
      .selectFrom('messages')
      .select(['body', 'overflow_ref', 'encryption_mode'])
      .where('channel_id', '=', channelId)
      .orderBy('created_at_unix', 'desc')
      .orderBy('event_seq', 'desc')
      .limit(1)
      .executeTakeFirst();
    if (!row) {
      return { preview: null, encrypted: false };
    }
    if (row.encryption_mode != null) {
      return { preview: null, encrypted: true };
    }
    if (row.body != null && row.body.trim() !== '') {
      return { preview: row.body, encrypted: false };
    }
    if (row.overflow_ref != null && row.overflow_ref.trim() !== '') {
      return { preview: row.overflow_ref, encrypted: false };
    }
    return { preview: null, encrypted: false };
  }

  async listChannelMessages(
    channelId: string,
    excludedAuthors: readonly string[],
    cursor: MessageCursorPayload | null,
    limitPlusOne: number,
    forContextViewer?: string,
  ): Promise<Message[]> {
    let query = this.db
      .selectFrom('messages')
      .selectAll()
      .where('channel_id', '=', channelId)
      .orderBy('created_at_unix', 'desc')
      .orderBy('event_seq', 'desc')
      .limit(limitPlusOne);

    if (excludedAuthors.length > 0) {
      query = query.where('author', 'not in', excludedAuthors as string[]);
    }

    if (forContextViewer) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('message_context_exclusions')
              .select('message_id')
              .whereRef('message_context_exclusions.message_id', '=', 'messages.message_id')
              .where('excluded_by', '=', forContextViewer),
          ),
        ),
      );
    }

    if (cursor) {
      query = query.where((eb) =>
        eb.or([
          eb('created_at_unix', '<', cursor.createdAtUnix),
          eb.and([
            eb('created_at_unix', '=', cursor.createdAtUnix),
            eb('event_seq', '<', cursor.eventSeq),
          ]),
        ]),
      );
    }

    return query.execute();
  }

  async findObjectMessageBySource(
    channelId: string,
    platform: string,
    sourceId: string,
  ): Promise<Message | undefined> {
    return this.db
      .selectFrom('messages')
      .selectAll()
      .where('channel_id', '=', channelId)
      .where('source_platform', '=', platform)
      .where('source_id', '=', sourceId)
      .executeTakeFirst();
  }

  async listActivityDedupCandidates(
    channelId: string,
    fingerprintV: number,
    fromUnix: number,
    toUnix: number,
  ): Promise<ActivityDedupCandidateRow[]> {
    const rows = await this.db
      .selectFrom('messages')
      .select([
        'message_id',
        'dup_group_id',
        'text_simhash',
        'image_phashes',
        'event_seq',
        'source_platform',
        'source_id',
        'author',
        'body',
      ])
      .select(
        sql<number>`COALESCE(original_created_at_unix, created_at_unix)`.as(
          'sort_time_unix',
        ),
      )
      .where('channel_id', '=', channelId)
      .where('fingerprint_v', '=', fingerprintV)
      .where(
        sql<boolean>`COALESCE(original_created_at_unix, created_at_unix) BETWEEN ${fromUnix} AND ${toUnix}`,
      )
      .execute();

    return rows.map((row) => ({
      message_id: row.message_id,
      dup_group_id: row.dup_group_id,
      text_simhash: row.text_simhash,
      image_phashes: row.image_phashes ?? [],
      sort_time_unix: Number(row.sort_time_unix),
      event_seq: row.event_seq,
      source_platform: row.source_platform,
      source_id: row.source_id,
      author: row.author,
      body: row.body,
    }));
  }

  async listObjectActivityMessages(
    objectId: string,
    excludedAuthors: readonly string[],
    cursor: MessageCursorPayload | null,
    limitPlusOne: number,
    forContextViewer?: string,
    includeDuplicates = false,
    includedAuthors?: readonly string[],
  ): Promise<ObjectActivityMessageRow[]> {
    const sortTime = sql`COALESCE(m.original_created_at_unix, m.created_at_unix)`;
    const duplicateCount = sql<number>`(
      SELECT COUNT(*)::int
      FROM messages d
      WHERE d.dup_group_id = m.dup_group_id
    )`.as('duplicate_count');

    let query = this.db
      .selectFrom('messages as m')
      .innerJoin('channels as c', 'c.channel_id', 'm.channel_id')
      .selectAll('m')
      .select('c.object_id as channel_object_id')
      .select(duplicateCount)
      .where('c.kind', '=', 'object')
      .where(sql<boolean>`(c.object_id = ${objectId} OR ${objectId} = ANY(m.linked_object_ids))`)
      .orderBy(sortTime, 'desc')
      .orderBy('m.event_seq', 'desc')
      .limit(limitPlusOne);

    if (!includeDuplicates) {
      query = query.where(sql<boolean>`m.message_id = m.dup_group_id`);
    }

    if (excludedAuthors.length > 0) {
      query = query.where('m.author', 'not in', excludedAuthors as string[]);
    }

    if (includedAuthors && includedAuthors.length > 0) {
      query = query.where('m.author', 'in', includedAuthors as string[]);
    }

    if (forContextViewer) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('message_context_exclusions')
              .select('message_id')
              .whereRef('message_context_exclusions.message_id', '=', 'm.message_id')
              .where('excluded_by', '=', forContextViewer),
          ),
        ),
      );
    }

    if (cursor) {
      query = query.where(sql<boolean>`
        (COALESCE(m.original_created_at_unix, m.created_at_unix) < ${cursor.createdAtUnix}
         OR (COALESCE(m.original_created_at_unix, m.created_at_unix) = ${cursor.createdAtUnix}
             AND m.event_seq < ${cursor.eventSeq}))
      `);
    }

    return query.execute();
  }

  async listFollowedObjectActivityMessages(
    account: string,
    excludedAuthors: readonly string[],
    cursor: MessageCursorPayload | null,
    limitPlusOne: number,
    forContextViewer?: string,
    includeDuplicates = false,
    includedAuthors?: readonly string[],
  ): Promise<ObjectActivityMessageRow[]> {
    const canonicalSql = includeDuplicates
      ? sql``
      : sql`AND m.message_id = m.dup_group_id`;
    const excludedSql =
      excludedAuthors.length > 0
        ? sql`AND m.author NOT IN (${sql.join(excludedAuthors.map((author) => sql`${author}`))})`
        : sql``;
    const includedSql =
      includedAuthors && includedAuthors.length > 0
        ? sql`AND m.author IN (${sql.join(includedAuthors.map((author) => sql`${author}`))})`
        : sql``;
    const authorSql = sql`${excludedSql} ${includedSql}`;
    const contextSql = forContextViewer
      ? sql`AND NOT EXISTS (
          SELECT 1
          FROM message_context_exclusions AS x
          WHERE x.message_id = m.message_id
            AND x.excluded_by = ${forContextViewer}
        )`
      : sql``;
    const cursorSql = cursor
      ? sql`AND (
          COALESCE(m.original_created_at_unix, m.created_at_unix) < ${cursor.createdAtUnix}
          OR (
            COALESCE(m.original_created_at_unix, m.created_at_unix) = ${cursor.createdAtUnix}
            AND m.event_seq < ${cursor.eventSeq}
          )
        )`
      : sql``;
    const rowFilters = () => sql`${canonicalSql} ${authorSql} ${contextSql} ${cursorSql}`;

    const result = await sql<ObjectActivityMessageRow>`
      WITH followed AS (
        SELECT uof.object_id
        FROM user_object_follows AS uof
        INNER JOIN objects_core AS oc
          ON oc.object_id = uof.object_id
         AND oc.status = 'active'
        WHERE uof.account = ${account}
      ),
      followed_channels AS (
        SELECT c.channel_id, c.object_id
        FROM channels AS c
        INNER JOIN followed AS f ON f.object_id = c.object_id
        WHERE c.kind = 'object'
      )
      SELECT
        page.*,
        (
          SELECT COUNT(*)::int
          FROM messages AS d
          WHERE d.dup_group_id = page.dup_group_id
        ) AS duplicate_count
      FROM (
        SELECT unioned.*
        FROM (
          (
            SELECT m.*, fc.object_id AS channel_object_id
            FROM followed_channels AS fc
            CROSS JOIN LATERAL (
              SELECT m.*
              FROM messages AS m
              WHERE m.channel_id = fc.channel_id
                ${rowFilters()}
              ORDER BY COALESCE(m.original_created_at_unix, m.created_at_unix) DESC,
                       m.event_seq DESC
              LIMIT ${limitPlusOne}
            ) AS m
          )
          UNION ALL
          (
            SELECT m.*, c.object_id AS channel_object_id
            FROM messages AS m
            INNER JOIN channels AS c ON c.channel_id = m.channel_id
            WHERE c.kind = 'object'
              AND c.object_id IS NOT NULL
              AND m.linked_object_ids && (
                SELECT COALESCE(array_agg(f.object_id), '{}'::text[])
                FROM followed AS f
              )
              AND c.object_id NOT IN (SELECT f.object_id FROM followed AS f)
              ${rowFilters()}
            ORDER BY COALESCE(m.original_created_at_unix, m.created_at_unix) DESC,
                     m.event_seq DESC
            LIMIT ${limitPlusOne}
          )
        ) AS unioned
        ORDER BY COALESCE(unioned.original_created_at_unix, unioned.created_at_unix) DESC,
                 unioned.event_seq DESC
        LIMIT ${limitPlusOne}
      ) AS page
    `.execute(this.db);

    return result.rows.map(normalizeActivityRow);
  }

  async findObjectChannelTitles(objectIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(objectIds.map((id) => id.trim()).filter(Boolean))];
    const out = new Map<string, string>();
    if (unique.length === 0) {
      return out;
    }

    const rows = await this.db
      .selectFrom('channels')
      .select(['object_id', 'title'])
      .where('kind', '=', 'object')
      .where('object_id', 'in', unique)
      .execute();

    for (const row of rows) {
      if (!row.object_id) {
        continue;
      }
      const title = row.title?.trim();
      out.set(row.object_id, title && title.length > 0 ? title : row.object_id);
    }

    for (const id of unique) {
      if (!out.has(id)) {
        out.set(id, id);
      }
    }

    return out;
  }

  async listContextExcludedMessageIds(
    viewer: string,
    messageIds: readonly string[],
  ): Promise<string[]> {
    if (messageIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .selectFrom('message_context_exclusions')
      .select('message_id')
      .where('excluded_by', '=', viewer)
      .where('message_id', 'in', messageIds as string[])
      .execute();
    return rows.map((r) => r.message_id);
  }
}

function normalizeActivityRow(row: ObjectActivityMessageRow): ObjectActivityMessageRow {
  return {
    ...row,
    created_at_unix: Number(row.created_at_unix),
    original_created_at_unix:
      row.original_created_at_unix == null ? null : Number(row.original_created_at_unix),
    updated_at_unix: row.updated_at_unix == null ? null : Number(row.updated_at_unix),
    event_seq: BigInt(row.event_seq),
    duplicate_count: Number(row.duplicate_count),
    mentions: row.mentions ?? [],
    linked_object_ids: row.linked_object_ids ?? [],
    image_phashes: row.image_phashes ?? [],
  };
}
