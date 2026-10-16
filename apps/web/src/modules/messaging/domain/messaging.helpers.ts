import { MAX_GROUP_CHANNEL_MEMBERS } from '@opden-data-layer/core/constants';
import { buildObjectChannelId } from '@opden-data-layer/core/utils/osl-messaging';
import {
  buildEncryptedMessageCreatePayload,
  buildGroupChannelCreatePayload,
  buildMessageCreatePayload,
  buildObjectChannelCreatePayload,
  generateGroupChannelId,
} from '@opden-data-layer/hive-broadcast';

import type {
  ChannelDetail,
  ChannelListItem,
  MessageItem,
  MessagingEncryptLockState,
} from './messaging.types';
import {
  EMPTY_LEAVE_POLICY,
  ENCRYPT_LOCK_COOKIE,
  ENCRYPT_LOCK_COOKIE_MAX_AGE_SECONDS,
  PLAIN_SEND_DISCLAIMER_STORAGE_KEY,
  encryptLockStorageKey,
} from './messaging.types';

export {
  MAX_GROUP_CHANNEL_MEMBERS,
  buildObjectChannelId,
  generateGroupChannelId,
  buildGroupChannelCreatePayload,
  buildObjectChannelCreatePayload,
  buildMessageCreatePayload,
  buildEncryptedMessageCreatePayload,
};

export function buildOptimisticGroupChannelListItem(input: {
  channelId: string;
  members: readonly string[];
  viewerUsername: string;
  title?: string;
}): ChannelListItem {
  const viewer = input.viewerUsername.trim();
  const memberAccounts = [
    ...new Set(
      [viewer, ...input.members.map((member) => member.trim()).filter((member) => member.length > 0)],
    ),
  ];
  const title =
    input.title?.trim() ||
    memberAccounts
      .filter((account) => account !== viewer)
      .sort((a, b) => a.localeCompare(b))
      .join(' & ') ||
    input.channelId;

  return {
    channel_id: input.channelId,
    kind: 'group',
    display_title: title,
    list_title: title,
    peer: null,
    members: memberAccounts,
    last_message_at_unix: null,
    unread_count: 0,
    image: null,
    last_message_preview: null,
    last_message_encrypted: false,
  };
}

export function buildOptimisticGroupChannelDetail(input: {
  channelId: string;
  members: readonly string[];
  viewerUsername: string;
  title?: string;
}): ChannelDetail {
  const listItem = buildOptimisticGroupChannelListItem(input);
  return {
    channel_id: listItem.channel_id,
    kind: 'group',
    creator: input.viewerUsername.trim(),
    title: input.title?.trim() || null,
    image: null,
    object_id: null,
    access: 'members_only',
    display_title: listItem.display_title,
    list_title: listItem.list_title,
    peer: null,
    members: listItem.members.map((account) => ({ account, role: 'member' as const })),
    viewer_role: 'admin',
    leave_policy: {
      can_leave: true,
      requires_successor: false,
      eligible_successors: [],
    },
  };
}

export function mergeChannelListItems(
  serverItems: readonly ChannelListItem[],
  localItems: readonly ChannelListItem[],
): ChannelListItem[] {
  const byId = new Map<string, ChannelListItem>();
  for (const item of localItems) {
    byId.set(item.channel_id, item);
  }
  for (const item of serverItems) {
    byId.set(item.channel_id, item);
  }
  return sortChannelListItems([...byId.values()]);
}

export function sortChannelListItems(
  items: readonly ChannelListItem[],
): ChannelListItem[] {
  return [...items].sort((a, b) => {
    const aTs = a.last_message_at_unix;
    const bTs = b.last_message_at_unix;
    if (aTs == null && bTs == null) {
      return a.channel_id.localeCompare(b.channel_id);
    }
    if (aTs == null) {
      return -1;
    }
    if (bTs == null) {
      return 1;
    }
    if (bTs !== aTs) {
      return bTs - aTs;
    }
    return a.channel_id.localeCompare(b.channel_id);
  });
}

export function buildSyntheticObjectChannel(input: {
  objectId: string;
  objectName: string;
  viewerUsername?: string | null;
}): ChannelDetail {
  return {
    channel_id: buildObjectChannelId(input.objectId),
    kind: 'object',
    creator: input.viewerUsername?.trim() ?? '',
    title: input.objectName,
    image: null,
    object_id: input.objectId,
    access: 'members_only',
    display_title: input.objectName,
    list_title: null,
    peer: null,
    members: [],
    viewer_role: null,
    leave_policy: EMPTY_LEAVE_POLICY,
  };
}

export function filterChannelsByFollowing<T extends Pick<ChannelListItem, 'kind' | 'peer' | 'members'>>(
  channels: readonly T[],
  followingSet: ReadonlySet<string>,
  viewerUsername: string | null,
): T[] {
  const viewer = viewerUsername?.trim().toLowerCase() ?? '';
  return channels.filter((channel) => {
    if (channel.kind === 'object') {
      return false;
    }
    if (channel.kind === 'direct') {
      const peer = channel.peer?.trim().toLowerCase() ?? '';
      return peer.length > 0 && followingSet.has(peer);
    }
    if (channel.kind === 'group') {
      return channel.members.some((member) => {
        const account = member.trim().toLowerCase();
        return account.length > 0 && account !== viewer && followingSet.has(account);
      });
    }
    return false;
  });
}

export function shouldShowPlainSendDisclaimer(hasPriorMessages: boolean): boolean {
  if (!hasPriorMessages) {
    return true;
  }
  return !isPlainSendDisclaimerDismissed();
}

export function filterChannelsBySearch<T extends Pick<ChannelListItem, 'display_title' | 'list_title'>>(
  channels: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...channels];
  }
  return channels.filter((channel) => {
    const display = (channel.display_title ?? '').toLowerCase();
    const list = (channel.list_title ?? '').toLowerCase();
    return display.includes(needle) || list.includes(needle);
  });
}

export type MessagePresentation =
  | { kind: 'plain'; text: string }
  | { kind: 'encrypted'; clickable: true }
  | { kind: 'one-way'; to: string }
  | { kind: 'decrypted'; text: string };

export function resolveMessagePresentation(
  message: Pick<MessageItem, 'body' | 'encryption' | 'author' | 'overflow_ref'>,
  viewerUsername: string | null,
  decryptedText?: string | null,
): MessagePresentation {
  if (decryptedText != null && decryptedText.length > 0) {
    return { kind: 'decrypted', text: decryptedText };
  }
  if (message.encryption == null) {
    return { kind: 'plain', text: messageDisplayBody(message) };
  }
  const viewer = viewerUsername?.trim().toLowerCase() ?? '';
  const outgoing =
    viewer.length > 0 && message.author.trim().toLowerCase() === viewer;
  if (outgoing && message.encryption.mode === 'ephemeral') {
    return { kind: 'one-way', to: message.encryption.to };
  }
  return { kind: 'encrypted', clickable: true };
}

export function canViewerAttemptDecryptMessage(
  message: Pick<MessageItem, 'encryption' | 'author'>,
  viewerUsername: string | null,
): boolean {
  if (message.encryption == null) {
    return false;
  }
  const viewer = viewerUsername?.trim().toLowerCase() ?? '';
  if (!viewer) {
    return false;
  }
  if (message.encryption.to.trim().toLowerCase() === viewer) {
    return true;
  }
  if (message.encryption.mode === 'memo') {
    return message.author.trim().toLowerCase() === viewer;
  }
  return false;
}

export function isPlainSendDisclaimerDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem(PLAIN_SEND_DISCLAIMER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPlainSendDisclaimer(): void {
  try {
    localStorage.setItem(PLAIN_SEND_DISCLAIMER_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

const DEFAULT_ENCRYPT_LOCK_STATE: MessagingEncryptLockState = {
  enabled: false,
  memoProbed: false,
};

function normalizeEncryptLockUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function readEncryptLockState(username: string): MessagingEncryptLockState {
  const account = normalizeEncryptLockUsername(username);
  if (!account || typeof window === 'undefined') {
    return { ...DEFAULT_ENCRYPT_LOCK_STATE };
  }
  try {
    const raw = localStorage.getItem(encryptLockStorageKey(account));
    if (!raw) {
      return { ...DEFAULT_ENCRYPT_LOCK_STATE };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_ENCRYPT_LOCK_STATE };
    }
    const record = parsed as Record<string, unknown>;
    return {
      enabled: record.enabled === true,
      memoProbed: record.memoProbed === true,
    };
  } catch {
    return { ...DEFAULT_ENCRYPT_LOCK_STATE };
  }
}

function writeEncryptLockState(
  username: string,
  patch: Partial<MessagingEncryptLockState>,
): void {
  const account = normalizeEncryptLockUsername(username);
  if (!account || typeof window === 'undefined') {
    return;
  }
  try {
    const current = readEncryptLockState(account);
    const next: MessagingEncryptLockState = {
      enabled: patch.enabled ?? current.enabled,
      memoProbed: patch.memoProbed === true || current.memoProbed,
    };
    localStorage.setItem(encryptLockStorageKey(account), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function encryptLockEnabledFromCookie(
  cookieValue: string | undefined,
  username: string,
): boolean {
  const account = normalizeEncryptLockUsername(username);
  if (!account || cookieValue == null) {
    return false;
  }
  return cookieValue.trim().toLowerCase() === account;
}

export function writeEncryptLockCookie(username: string, enabled: boolean): void {
  const account = normalizeEncryptLockUsername(username);
  if (!account || typeof document === 'undefined') {
    return;
  }
  try {
    if (enabled) {
      document.cookie = `${ENCRYPT_LOCK_COOKIE}=${encodeURIComponent(account)}; Max-Age=${ENCRYPT_LOCK_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
      return;
    }
    document.cookie = `${ENCRYPT_LOCK_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function writeEncryptLockEnabled(username: string, enabled: boolean): void {
  writeEncryptLockState(username, { enabled });
  writeEncryptLockCookie(username, enabled);
}

/** Persist a successful Keychain memo probe only. Failures are never cached. */
export function writeEncryptLockMemoProbed(username: string): void {
  writeEncryptLockState(username, { memoProbed: true });
}

export function buildChannelLeavePayload(input: {
  channelId: string;
  successorAdmin?: string;
  deleteMyMessages?: boolean;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    channel_id: input.channelId,
  };
  const successor = input.successorAdmin?.trim();
  if (successor) {
    payload.successor_admin = successor;
  }
  if (input.deleteMyMessages === true) {
    payload.delete_my_messages = true;
  }
  return payload;
}

export function buildChannelUpdatePayload(input: {
  channelId: string;
  title?: string;
  imageCid?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    channel_id: input.channelId,
  };
  const title = input.title?.trim();
  if (title) {
    payload.title = title;
  }
  const cid = input.imageCid?.trim();
  if (cid) {
    payload.image = { cid };
  }
  if (payload.title === undefined && payload.image === undefined) {
    throw new Error('title or imageCid is required');
  }
  return payload;
}

export function buildChannelMemberAddPayload(input: {
  channelId: string;
  account: string;
}): Record<string, string> {
  return {
    channel_id: input.channelId,
    account: input.account.trim(),
  };
}

export function remainingGroupMemberSlots(currentMemberCount: number): number {
  return Math.max(0, MAX_GROUP_CHANNEL_MEMBERS - currentMemberCount);
}

export function canSelectMoreGroupMembers(
  currentMemberCount: number,
  additionalCount: number,
): boolean {
  return currentMemberCount + additionalCount <= MAX_GROUP_CHANNEL_MEMBERS;
}

export function resolveChannelImageUrl(
  image: unknown,
  contentBaseUrl?: string | null,
): string | null {
  if (image == null || typeof image !== 'object') {
    return null;
  }
  const record = image as Record<string, unknown>;
  if (typeof record.url === 'string' && record.url.trim() !== '') {
    return record.url.trim();
  }
  const cid = typeof record.cid === 'string' ? record.cid.trim() : '';
  if (cid && contentBaseUrl) {
    const base = contentBaseUrl.replace(/\/$/, '');
    return `${base}/ipfs-gateway/content/image/${cid}`;
  }
  return null;
}

export function hiveAvatarUrl(username: string): string {
  return `https://images.hive.blog/u/${encodeURIComponent(username)}/avatar`;
}

export function messageDisplayBody(message: Pick<MessageItem, 'body' | 'overflow_ref'>): string {
  if (message.body != null && message.body.trim() !== '') {
    return message.body;
  }
  if (message.overflow_ref != null && message.overflow_ref.trim() !== '') {
    return message.overflow_ref;
  }
  return '';
}

export function isOutgoingMessage(
  message: Pick<MessageItem, 'author'>,
  viewerUsername: string | null,
): boolean {
  const viewer = viewerUsername?.trim().toLowerCase();
  if (!viewer) {
    return false;
  }
  return message.author.trim().toLowerCase() === viewer;
}

export function formatOriginalCreatedAtLabel(unix: number, locale: string): string {
  return new Date(unix * 1000).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatActivityMessageTime(
  message: Pick<MessageItem, 'created_at_unix' | 'original_created_at_unix'>,
  locale: string,
): string {
  if (message.original_created_at_unix != null) {
    return formatOriginalCreatedAtLabel(message.original_created_at_unix, locale);
  }
  return new Date(message.created_at_unix * 1000).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatActivityMessageCaption(
  message: Pick<
    MessageItem,
    'created_at_unix' | 'original_created_at_unix' | 'updated_at_unix'
  >,
  locale: string,
  originallyLabel: string,
  editedLabel?: string,
): string {
  let base: string;
  if (message.original_created_at_unix != null) {
    const datetime = formatOriginalCreatedAtLabel(message.original_created_at_unix, locale);
    base = originallyLabel.replace('{datetime}', datetime);
  } else {
    base = formatActivityMessageTime(message, locale);
  }
  if (message.updated_at_unix != null && editedLabel) {
    return `${base} ${editedLabel}`;
  }
  return base;
}

export function messageActivitySortUnix(
  message: Pick<MessageItem, 'created_at_unix' | 'original_created_at_unix'>,
): number {
  return message.original_created_at_unix ?? message.created_at_unix;
}

/** Newest first. Client has no event_seq; tie-break created_at then message_id. */
export function compareActivityMessagesDesc(a: MessageItem, b: MessageItem): number {
  const diff = messageActivitySortUnix(b) - messageActivitySortUnix(a);
  if (diff !== 0) {
    return diff;
  }
  const createdDiff = b.created_at_unix - a.created_at_unix;
  if (createdDiff !== 0) {
    return createdDiff;
  }
  return b.message_id.localeCompare(a.message_id);
}

function localDayKeyFromUnix(unix: number): string {
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MESSAGE_QUOTE_BODY_MAX = 200;

export function truncateQuoteBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= MESSAGE_QUOTE_BODY_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, MESSAGE_QUOTE_BODY_MAX)}…`;
}

export type MessageQuotePreview = {
  author: string;
  body: string;
  deleted: boolean;
  imageUrl?: string;
};

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\((https?:\/\/[^)\s"'<>]+)\)/;
const HTML_IMG_SRC_RE = /<img[^>]+src=["'](https?:\/\/[^"'<>]+)["']/i;

export function extractFirstImageUrlFromMessageBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }
  const markdownMatch = trimmed.match(MARKDOWN_IMAGE_RE);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }
  const htmlMatch = trimmed.match(HTML_IMG_SRC_RE);
  if (htmlMatch?.[1]) {
    return htmlMatch[1];
  }
  return null;
}

export function stripImageMarkupFromMessageBody(body: string): string {
  return body
    .replace(MARKDOWN_IMAGE_RE, '')
    .replace(HTML_IMG_SRC_RE, '')
    .trim();
}

function buildQuotePreviewBody(rawBody: string): { body: string; imageUrl?: string } {
  const imageUrl = extractFirstImageUrlFromMessageBody(rawBody) ?? undefined;
  const stripped = stripImageMarkupFromMessageBody(rawBody);
  return {
    body: truncateQuoteBody(stripped),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function parseQuoteJson(value: unknown): { author: string; body: string } | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const author = record['author'];
  const body = record['body'];
  if (typeof author !== 'string' || typeof body !== 'string') {
    return null;
  }
  return { author, body };
}

export function resolveMessageQuotePreview(
  message: Pick<MessageItem, 'reply_to' | 'quote_json'>,
  messagesById: ReadonlyMap<string, MessageItem>,
): MessageQuotePreview | null {
  if (!message.reply_to) {
    return null;
  }
  const parent = messagesById.get(message.reply_to);
  if (parent) {
    const preview = buildQuotePreviewBody(messageDisplayBody(parent));
    return {
      author: parent.author,
      body: preview.body,
      deleted: false,
      ...(preview.imageUrl ? { imageUrl: preview.imageUrl } : {}),
    };
  }
  const quote = parseQuoteJson(message.quote_json);
  if (quote) {
    const preview = buildQuotePreviewBody(quote.body);
    return {
      author: quote.author,
      body: preview.body,
      deleted: false,
      ...(preview.imageUrl ? { imageUrl: preview.imageUrl } : {}),
    };
  }
  return { author: '', body: '', deleted: true };
}

export function buildReplyQuoteJson(
  message: Pick<MessageItem, 'author' | 'body' | 'overflow_ref'>,
): { author: string; body: string } {
  return {
    author: message.author,
    body: truncateQuoteBody(messageDisplayBody(message)),
  };
}

export function messageCopyText(
  message: Pick<MessageItem, 'body' | 'overflow_ref'>,
): string | null {
  const text = messageDisplayBody(message).trim();
  return text.length > 0 ? text : null;
}

export function formatMessageTimeCaption(
  createdAtUnix: number,
  locale: string,
  updatedAtUnix: number | null,
  editedLabel?: string,
): string {
  const time = new Date(createdAtUnix * 1000).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (updatedAtUnix != null && editedLabel) {
    return `${time} ${editedLabel}`;
  }
  return time;
}

export type MessageDayGroup = {
  dayKey: string;
  label: string;
  messages: MessageItem[];
};

export function groupMessagesByDay(
  messages: readonly MessageItem[],
  formatDayLabel: (unix: number) => string,
  getSortUnix: (m: MessageItem) => number = (m) => m.created_at_unix,
): MessageDayGroup[] {
  const groups: MessageDayGroup[] = [];
  for (const message of messages) {
    const unix = getSortUnix(message);
    const dayKey = localDayKeyFromUnix(unix);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.messages.push(message);
      continue;
    }
    groups.push({
      dayKey,
      label: formatDayLabel(unix),
      messages: [message],
    });
  }
  return groups;
}

export function canSendMessageBody(body: string): boolean {
  return body.trim().length > 0;
}
