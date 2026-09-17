import { Injectable, Logger } from '@nestjs/common';
import { JsonValue } from '@opden-data-layer/odl-db-types';

import {
  blockTimestampToUnixSeconds,
  buildDmAlias,
  buildDmChannelId,
  ACTIVITY_DEDUP_WINDOW_SEC,
  buildOslMessageId,
  CHANNEL_ACCESS,
  CHANNEL_KINDS,
  CHANNEL_MEMBER_ROLES,
  extractObjectIdsFromCommentBody,
  resolveMessageLinkedObjectIds,
} from '@opden-data-layer/core';
import { computeDmPairHash } from '@opden-data-layer/core/utils/osl-messaging-crypto';
import { ChannelsRepository } from '../../../repositories/channels.repository';
import { MessagesRepository } from '../../../repositories/messages.repository';
import { ObjectsCoreRepository } from '../../../repositories/objects-core.repository';
import type { OdlActionHandler, OdlEventContext } from '../../odl-shared';
import { NotificationEmitterService } from '../../notification-adapter/notification-emitter.service';
import {
  messageCreatePayloadSchema,
  type MessageCreatePayload,
} from '../osl-envelope.schema';
import { parseMessageSourceForObjectChannel } from '../parse-message-source';
import { resolveOriginalCreatedAtUnix } from '../resolve-original-created-at-unix';
import { resolveDupGroupId } from '../resolve-activity-dedup';

@Injectable()
export class MessageCreateHandler implements OdlActionHandler {
  readonly action = 'message_create';
  private readonly logger = new Logger(MessageCreateHandler.name);

  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly notificationEmitter: NotificationEmitterService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = messageCreatePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid message_create payload: ${result.error.message}`);
      return;
    }

    const data = result.data;
    const createdAtUnix = blockTimestampToUnixSeconds(ctx.timestamp);
    const messageId = buildOslMessageId(
      ctx.transactionId,
      ctx.transactionIndex,
      ctx.operationIndex,
      ctx.odlEventIndex,
    );

    if (await this.messagesRepository.tombstoneExists(messageId)) {
      this.logger.warn(
        `message_create: tombstone exists for '${messageId}'; skipping`,
      );
      return;
    }

    let channelId: string | undefined;

    if (data.peer !== undefined || data.members !== undefined) {
      const members = this.resolveDmMembers(data, ctx.creator);
      if (!members) {
        return;
      }
      channelId = await this.resolveOrCreateDmChannel(members, ctx, createdAtUnix);
      if (!channelId) {
        return;
      }
    } else if (data.channel_id !== undefined) {
      channelId = data.channel_id;
    } else {
      return;
    }

    const channel = await this.channelsRepository.findById(channelId);
    if (!channel) {
      this.logger.warn(
        `message_create: channel '${channelId}' not found; skipping`,
      );
      return;
    }

    if (channel.kind === CHANNEL_KINDS[2]) {
      // object channel: open write
    } else if (
      channel.kind === CHANNEL_KINDS[0] ||
      channel.kind === CHANNEL_KINDS[1]
    ) {
      const isMember = await this.channelsRepository.isMember(channelId, ctx.creator);
      if (!isMember) {
        this.logger.warn(
          `message_create: '${ctx.creator}' is not a member of '${channelId}'; skipping`,
        );
        return;
      }
    } else {
      this.logger.warn(`message_create: unknown channel kind; skipping`);
      return;
    }

    if (channel.dissolved_at_unix != null) {
      this.logger.warn(
        `message_create: channel '${channelId}' is dissolved; skipping`,
      );
      return;
    }

    if (channel.kind === CHANNEL_KINDS[2] && data.encrypted_body != null) {
      this.logger.warn(
        'message_create: encrypted messages are not allowed on object channels; skipping',
      );
      return;
    }

    const existingMessage = await this.messagesRepository.findById(messageId);
    if (existingMessage) {
      return;
    }

    if (data.reply_to != null) {
      const parentValid = await this.isValidReplyParent(data.reply_to, channelId);
      if (!parentValid) {
        this.logger.warn(
          `message_create: invalid reply_to '${data.reply_to}' for channel '${channelId}'; skipping`,
        );
        return;
      }
    }

    const mentions = data.mentions ?? [];
    const nowUnix = Math.trunc(Date.now() / 1000);
    const originalCreatedAtUnix = resolveOriginalCreatedAtUnix({
      channelKind: channel.kind,
      stamp: data.original_created_at_unix,
      nowUnix,
    });

    const linkedObjectIds = await this.resolveLinkedObjectIdsForChannel(
      channel.kind,
      channel.object_id,
      data.body,
      data.encrypted_body,
    );

    const activityFields = await this.resolveActivityFields({
      channelKind: channel.kind,
      channelId: channelId!,
      messageId,
      source: data.source,
      originalCreatedAtUnix,
      createdAtUnix,
    });
    if (activityFields === 'skip') {
      return;
    }

    let inserted = false;
    await this.channelsRepository.runInTransaction(async (trx) => {
      inserted = await this.messagesRepository.insertMessage(
        {
          message_id: messageId,
          channel_id: channelId!,
          author: ctx.creator,
          body: data.body ?? null,
          overflow_ref: data.overflow_ref ?? null,
          encrypted_body: data.encrypted_body ?? null,
          encryption_mode: data.encryption?.mode ?? null,
          encrypted_to: data.encryption?.to ?? null,
          encryption_v: data.encryption?.v ?? null,
          encryption_meta: null,
          reply_to: data.reply_to ?? null,
          quote_json: (data.quote_json as JsonValue | undefined) ?? null,
          attachments: (data.attachments as JsonValue | undefined) ?? null,
          mentions,
          linked_object_ids: linkedObjectIds,
          source_platform: activityFields.source_platform,
          source_id: activityFields.source_id,
          text_simhash: activityFields.text_simhash,
          image_phashes: activityFields.image_phashes,
          fingerprint_v: activityFields.fingerprint_v,
          dup_group_id: activityFields.dup_group_id,
          original_created_at_unix: originalCreatedAtUnix,
          updated_at_unix: null,
          created_at_unix: createdAtUnix,
          event_seq: ctx.eventSeq,
          transaction_id: ctx.transactionId,
        },
        trx,
      );
      if (inserted) {
        await this.channelsRepository.updateLastMessageAt(channelId!, createdAtUnix, trx);
      }
    });

    if (!inserted) {
      return;
    }

    this.emitMessageNotification(channel, channelId!, messageId, data, ctx, linkedObjectIds);
  }

  private async resolveActivityFields(input: {
    channelKind: string;
    channelId: string;
    messageId: string;
    source: MessageCreatePayload['source'];
    originalCreatedAtUnix: number | null;
    createdAtUnix: number;
  }): Promise<
    | 'skip'
    | {
        source_platform: string | null;
        source_id: string | null;
        text_simhash: bigint | null;
        image_phashes: bigint[];
        fingerprint_v: number | null;
        dup_group_id: string;
      }
  > {
    const defaults = {
      source_platform: null as string | null,
      source_id: null as string | null,
      text_simhash: null as bigint | null,
      image_phashes: [] as bigint[],
      fingerprint_v: null as number | null,
      dup_group_id: input.messageId,
    };

    if (input.channelKind !== CHANNEL_KINDS[2]) {
      return defaults;
    }

    const parsed = parseMessageSourceForObjectChannel(input.source);
    if (parsed == null) {
      return defaults;
    }

    const existing = await this.messagesRepository.findBySource(
      input.channelId,
      parsed.platform,
      parsed.sourceId,
    );
    if (existing) {
      this.logger.warn(
        `message_create: source ${parsed.platform}/${parsed.sourceId} already exists on channel '${input.channelId}'; skipping`,
      );
      return 'skip';
    }

    const sortUnix = input.originalCreatedAtUnix ?? input.createdAtUnix;
    let dupGroupId = input.messageId;

    if (parsed.fingerprintV != null) {
      const fromUnix = sortUnix - ACTIVITY_DEDUP_WINDOW_SEC;
      const toUnix = sortUnix + ACTIVITY_DEDUP_WINDOW_SEC;
      const candidates = await this.messagesRepository.listDedupCandidates(
        input.channelId,
        parsed.fingerprintV,
        fromUnix,
        toUnix,
      );
      dupGroupId = resolveDupGroupId({
        messageId: input.messageId,
        incoming: {
          fingerprintV: parsed.fingerprintV,
          textSimhash: parsed.textSimhash,
          imagePhashes: parsed.imagePhashes,
          sourceTimeUnix: sortUnix,
        },
        candidates,
      });
    }

    return {
      source_platform: parsed.platform,
      source_id: parsed.sourceId,
      text_simhash: parsed.textSimhash,
      image_phashes: parsed.imagePhashes,
      fingerprint_v: parsed.fingerprintV,
      dup_group_id: dupGroupId,
    };
  }

  private async resolveLinkedObjectIdsForChannel(
    channelKind: string,
    nativeObjectId: string | null,
    body: string | null | undefined,
    encryptedBody: string | null | undefined,
  ): Promise<string[]> {
    if (channelKind !== CHANNEL_KINDS[2] || encryptedBody != null || body == null) {
      return [];
    }

    const candidates = extractObjectIdsFromCommentBody(body);
    if (candidates.length === 0) {
      return [];
    }

    const types = await this.objectsCoreRepository.findObjectTypesByIds(candidates);
    return resolveMessageLinkedObjectIds({
      body,
      nativeObjectId,
      existingObjectIds: [...types.keys()],
    });
  }

  private emitMessageNotification(
    channel: NonNullable<Awaited<ReturnType<ChannelsRepository['findById']>>>,
    channelId: string,
    messageId: string,
    data: { encrypted_body?: string | null },
    ctx: OdlEventContext,
    linkedObjectIds: readonly string[],
  ): void {
    const encrypted = data.encrypted_body != null;
    const emitCtx = this.notificationEmitter.odlContext(ctx);

    if (channel.kind === CHANNEL_KINDS[2]) {
      if (!channel.object_id) {
        return;
      }
      const objectIds = dedupeStrings([channel.object_id, ...linkedObjectIds]);
      for (const objectId of objectIds) {
        this.notificationEmitter.emitWithContext(emitCtx, {
          type: 'bell_object_message',
          objectId,
          actor: ctx.creator,
          payload: {
            channelId,
            messageId,
            author: ctx.creator,
            encrypted,
          },
        });
      }
      return;
    }

    if (channel.kind === CHANNEL_KINDS[0]) {
      this.notificationEmitter.emitWithContext(emitCtx, {
        type: 'message_direct',
        objectId: null,
        actor: ctx.creator,
        payload: {
          channelId,
          messageId,
          author: ctx.creator,
          encrypted,
        },
      });
      return;
    }

    if (channel.kind === CHANNEL_KINDS[1]) {
      this.notificationEmitter.emitWithContext(emitCtx, {
        type: 'message_group',
        objectId: null,
        actor: ctx.creator,
        payload: {
          channelId,
          messageId,
          author: ctx.creator,
          channelTitle: channel.title,
          encrypted,
        },
      });
    }
  }

  private async isValidReplyParent(
    replyTo: string,
    channelId: string,
  ): Promise<boolean> {
    if (await this.messagesRepository.tombstoneExists(replyTo)) {
      return false;
    }
    const parent = await this.messagesRepository.findById(replyTo);
    if (!parent || parent.channel_id !== channelId) {
      return false;
    }
    return true;
  }

  private resolveDmMembers(
    data: { peer?: string; members?: string[] },
    signer: string,
  ): [string, string] | null {
    if (data.peer !== undefined) {
      const peer = data.peer.trim();
      if (peer.length === 0 || peer === signer) {
        this.logger.warn('message_create: invalid peer for DM bootstrap; skipping');
        return null;
      }
      return [signer, peer];
    }

    const members = data.members!;
    const normalized = members.map((m) => m.trim());
    if (!normalized.includes(signer)) {
      this.logger.warn('message_create: signer must be in members; skipping');
      return null;
    }
    const other = normalized.find((m) => m !== signer);
    if (!other) {
      this.logger.warn('message_create: DM requires two distinct members; skipping');
      return null;
    }
    return [signer, other];
  }

  private async resolveOrCreateDmChannel(
    members: [string, string],
    ctx: OdlEventContext,
    createdAtUnix: number,
  ): Promise<string | undefined> {
    const pairHash = computeDmPairHash(members);
    const channelId = buildDmChannelId(pairHash);

    const existing =
      (await this.channelsRepository.findByPairHash(pairHash)) ??
      (await this.channelsRepository.findById(channelId));
    if (existing) {
      return existing.channel_id;
    }

    await this.channelsRepository.runInTransaction(async (trx) => {
      const again =
        (await this.channelsRepository.findByPairHash(pairHash, trx)) ??
        (await this.channelsRepository.findById(channelId, trx));
      if (again) {
        return;
      }

      await this.channelsRepository.insertChannel(
        {
          channel_id: channelId,
          kind: CHANNEL_KINDS[0],
          creator: ctx.creator,
          title: null,
          image: null,
          object_id: null,
          pair_hash: pairHash,
          access: CHANNEL_ACCESS[0],
          last_message_at_unix: createdAtUnix,
          created_at_unix: createdAtUnix,
          event_seq: ctx.eventSeq,
          transaction_id: ctx.transactionId,
        },
        trx,
      );

      for (const account of members) {
        await this.channelsRepository.insertMember(
          {
            channel_id: channelId,
            account,
            role: CHANNEL_MEMBER_ROLES[1],
            joined_at_unix: createdAtUnix,
          },
          trx,
        );
      }

      await this.channelsRepository.insertAlias(
        {
          alias: buildDmAlias(pairHash),
          channel_id: channelId,
          registered_by: ctx.creator,
          created_at_unix: createdAtUnix,
          event_seq: ctx.eventSeq,
        },
        trx,
      );
    });

    return channelId;
  }
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => v.length > 0))];
}
