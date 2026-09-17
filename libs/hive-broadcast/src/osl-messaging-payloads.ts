import { buildObjectChannelId } from '@opden-data-layer/core/utils/osl-messaging';

const GROUP_CHANNEL_ID_MAX_LENGTH = 256;
const GROUP_CHANNEL_ID_PREFIX = 'grp-';

export function generateGroupChannelId(): string {
  const id = `${GROUP_CHANNEL_ID_PREFIX}${crypto.randomUUID()}`;
  if (id.length > GROUP_CHANNEL_ID_MAX_LENGTH) {
    throw new Error('group channel id exceeds max length');
  }
  return id;
}

export function buildGroupChannelCreatePayload(input: {
  channelId: string;
  members: readonly string[];
  title?: string;
  viewerUsername?: string;
}): Record<string, unknown> {
  const viewer = input.viewerUsername?.trim().toLowerCase();
  const members = [
    ...new Set(
      input.members
        .map((member) => member.trim())
        .filter((member) => member.length > 0)
        .filter((member) => member.toLowerCase() !== viewer),
    ),
  ];
  const payload: Record<string, unknown> = {
    kind: 'group',
    channel_id: input.channelId,
    members,
  };
  const title = input.title?.trim();
  if (title) {
    payload['title'] = title;
  }
  return payload;
}

export function buildObjectChannelCreatePayload(input: {
  objectId: string;
  objectName?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    kind: 'object',
    channel_id: buildObjectChannelId(input.objectId),
    object_id: input.objectId,
  };
  const title = input.objectName?.trim();
  if (title) {
    payload['title'] = title;
  }
  return payload;
}

export function buildMessageCreatePayload(input: {
  channelId?: string;
  peer?: string;
  body: string;
  originalCreatedAtUnix?: number | null;
  replyTo?: string;
  quoteJson?: { author: string; body: string };
  source?: {
    platform: string;
    id: string;
    fpV?: number;
    textSimhash?: string | null;
    imagePHashes?: string[];
  };
}): Record<string, unknown> {
  const body = input.body.trim();
  const stamp =
    input.originalCreatedAtUnix != null && input.originalCreatedAtUnix > 0
      ? Math.trunc(input.originalCreatedAtUnix)
      : null;
  const base: Record<string, unknown> = { body };
  if (input.channelId) {
    base['channel_id'] = input.channelId;
  } else if (input.peer) {
    base['peer'] = input.peer;
  } else {
    throw new Error('channelId or peer is required');
  }
  if (stamp != null) {
    base['original_created_at_unix'] = stamp;
  }
  if (input.replyTo?.trim()) {
    base['reply_to'] = input.replyTo.trim();
  }
  if (input.quoteJson) {
    base['quote_json'] = input.quoteJson;
  }
  if (input.source != null) {
    const sourcePayload: Record<string, unknown> = {
      platform: input.source.platform,
      id: input.source.id,
    };
    if (input.source.fpV != null) {
      sourcePayload['fp_v'] = input.source.fpV;
    }
    if (input.source.textSimhash != null && input.source.textSimhash.trim() !== '') {
      sourcePayload['text_simhash'] = input.source.textSimhash.trim().toLowerCase();
    }
    const imagePhashes = (input.source.imagePHashes ?? []).filter(
      (hex) => hex.trim().length > 0,
    );
    if (imagePhashes.length > 0) {
      sourcePayload['image_phashes'] = imagePhashes.map((hex) =>
        hex.trim().toLowerCase(),
      );
    }
    base['source'] = sourcePayload;
  }
  return base;
}

export function buildMessageUpdatePayload(input: {
  channelId: string;
  messageId: string;
  body: string;
}): Record<string, string> {
  return {
    channel_id: input.channelId,
    message_id: input.messageId,
    body: input.body.trim(),
  };
}

export function buildMessageDeletePayload(input: {
  channelId: string;
  messageId: string;
}): Record<string, string> {
  return {
    channel_id: input.channelId,
    message_id: input.messageId,
  };
}

export function buildEncryptedMessageCreatePayload(input: {
  channelId?: string;
  peer?: string;
  ciphertext: string;
  mode: 'memo' | 'ephemeral';
  to: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    encrypted_body: input.ciphertext,
    encryption: { v: 1, mode: input.mode, to: input.to },
  };
  if (input.channelId) {
    payload['channel_id'] = input.channelId;
  } else if (input.peer) {
    payload['peer'] = input.peer;
  } else {
    throw new Error('channelId or peer is required');
  }
  return payload;
}
