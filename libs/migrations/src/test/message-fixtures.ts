import type { Kysely } from 'kysely';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';

export async function insertTestChannel(
  db: Kysely<OdlDatabase>,
  channelId: string,
): Promise<void> {
  await db
    .insertInto('channels')
    .values({
      channel_id: channelId,
      kind: 'group',
      creator: 'alice',
      access: 'members_only',
      created_at_unix: 1_700_000_000,
      event_seq: BigInt(1),
      transaction_id: 'tx-channel',
    })
    .execute();
}

export async function insertTestMessage(
  db: Kysely<OdlDatabase>,
  input: {
    message_id: string;
    channel_id: string;
    source_platform?: string | null;
    source_id?: string | null;
    dup_group_id?: string;
    text_simhash?: bigint | null;
    fingerprint_v?: number | null;
    image_phashes?: bigint[];
  },
): Promise<void> {
  await db
    .insertInto('messages')
    .values({
      message_id: input.message_id,
      channel_id: input.channel_id,
      author: 'alice',
      body: 'fixture body for migration tests',
      mentions: [],
      linked_object_ids: [],
      created_at_unix: 1_700_000_000,
      event_seq: BigInt(1),
      transaction_id: 'tx-message',
      source_platform: input.source_platform ?? null,
      source_id: input.source_id ?? null,
      text_simhash: input.text_simhash ?? null,
      fingerprint_v: input.fingerprint_v ?? null,
      image_phashes: input.image_phashes ?? [],
      dup_group_id: input.dup_group_id ?? input.message_id,
    })
    .execute();
}
