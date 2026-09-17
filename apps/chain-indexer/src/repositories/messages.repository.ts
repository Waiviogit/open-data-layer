import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { Message, NewMessage, NewMessageContextExclusion, NewMessageTombstone } from '@opden-data-layer/odl-db-types';

import type { Database } from '../database';
import { KYSELY } from '../database';
import type { DbExecutor } from './channels.repository';

export type DedupCandidateRow = {
  message_id: string;
  dup_group_id: string;
  text_simhash: bigint | null;
  image_phashes: bigint[];
  sort_time_unix: number;
  event_seq: bigint;
};

@Injectable()
export class MessagesRepository {
  private readonly logger = new Logger(MessagesRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  executor(trx?: DbExecutor): DbExecutor {
    return trx ?? this.db;
  }

  async runInTransaction<T>(fn: (trx: DbExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(fn);
  }

  async findById(messageId: string, trx?: DbExecutor): Promise<Message | undefined> {
    return this.executor(trx)
      .selectFrom('messages')
      .selectAll()
      .where('message_id', '=', messageId)
      .executeTakeFirst();
  }

  async tombstoneExists(messageId: string, trx?: DbExecutor): Promise<boolean> {
    const row = await this.executor(trx)
      .selectFrom('message_tombstones')
      .select('message_id')
      .where('message_id', '=', messageId)
      .executeTakeFirst();
    return row !== undefined;
  }

  async insertMessage(row: NewMessage, trx?: DbExecutor): Promise<boolean> {
    try {
      await this.executor(trx).insertInto('messages').values(row).execute();
      return true;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        this.logger.warn(
          `messages insert skipped: unique constraint violation for message ${row.message_id}`,
        );
        return false;
      }
      throw error;
    }
  }

  async findBySource(
    channelId: string,
    platform: string,
    sourceId: string,
    trx?: DbExecutor,
  ): Promise<Message | undefined> {
    return this.executor(trx)
      .selectFrom('messages')
      .selectAll()
      .where('channel_id', '=', channelId)
      .where('source_platform', '=', platform)
      .where('source_id', '=', sourceId)
      .executeTakeFirst();
  }

  async listDedupCandidates(
    channelId: string,
    fingerprintV: number,
    fromUnix: number,
    toUnix: number,
    trx?: DbExecutor,
  ): Promise<DedupCandidateRow[]> {
    const rows = await this.executor(trx)
      .selectFrom('messages')
      .select([
        'message_id',
        'dup_group_id',
        'text_simhash',
        'image_phashes',
        'event_seq',
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
    }));
  }

  async listClusterMembers(
    dupGroupId: string,
    trx?: DbExecutor,
  ): Promise<Message[]> {
    return this.executor(trx)
      .selectFrom('messages')
      .selectAll()
      .where('dup_group_id', '=', dupGroupId)
      .orderBy('event_seq', 'asc')
      .execute();
  }

  async repointDupGroup(
    fromGroupId: string,
    toGroupId: string,
    trx?: DbExecutor,
  ): Promise<void> {
    await this.executor(trx)
      .updateTable('messages')
      .set({ dup_group_id: toGroupId })
      .where('dup_group_id', '=', fromGroupId)
      .execute();
  }

  async updateBody(
    input: {
      message_id: string;
      body: string;
      updated_at_unix: number;
      linked_object_ids?: string[];
    },
    trx?: DbExecutor,
  ): Promise<void> {
    const patch: {
      body: string;
      updated_at_unix: number;
      linked_object_ids?: string[];
    } = {
      body: input.body,
      updated_at_unix: input.updated_at_unix,
    };
    if (input.linked_object_ids !== undefined) {
      patch.linked_object_ids = input.linked_object_ids;
    }
    await this.executor(trx)
      .updateTable('messages')
      .set(patch)
      .where('message_id', '=', input.message_id)
      .execute();
  }

  async deleteAndTombstone(
    tombstone: NewMessageTombstone,
    trx?: DbExecutor,
  ): Promise<void> {
    const e = this.executor(trx);
    await e.deleteFrom('messages').where('message_id', '=', tombstone.message_id).execute();
    await e
      .insertInto('message_tombstones')
      .values(tombstone)
      .onConflict((oc) => oc.column('message_id').doNothing())
      .execute();
  }

  async listByAuthorInChannel(
    channelId: string,
    author: string,
    trx?: DbExecutor,
  ): Promise<Message[]> {
    return this.executor(trx)
      .selectFrom('messages')
      .selectAll()
      .where('channel_id', '=', channelId)
      .where('author', '=', author)
      .execute();
  }

  async deleteAllByAuthorInChannel(
    input: {
      channelId: string;
      author: string;
      deletedBy: string;
      deletedAtUnix: number;
      eventSeq: bigint;
      transactionId: string;
    },
    trx?: DbExecutor,
  ): Promise<void> {
    const messages = await this.listByAuthorInChannel(
      input.channelId,
      input.author,
      trx,
    );
    for (const message of messages) {
      if (await this.tombstoneExists(message.message_id, trx)) {
        continue;
      }
      await this.deleteAndTombstone(
        {
          message_id: message.message_id,
          channel_id: input.channelId,
          deleted_by: input.deletedBy,
          deleted_at_unix: input.deletedAtUnix,
          event_seq: input.eventSeq,
          transaction_id: input.transactionId,
        },
        trx,
      );
    }
  }

  async upsertContextExclusion(
    row: NewMessageContextExclusion,
    trx?: DbExecutor,
  ): Promise<void> {
    await this.executor(trx)
      .insertInto('message_context_exclusions')
      .values(row)
      .onConflict((oc) => oc.column('message_id').doNothing())
      .execute();
  }
}
