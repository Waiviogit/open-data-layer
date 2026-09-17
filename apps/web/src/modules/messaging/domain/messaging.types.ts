export type MessageEncryption = {
  v: number;
  mode: 'memo' | 'ephemeral';
  to: string;
};

export type ChannelListItem = {
  channel_id: string;
  kind: string;
  display_title: string | null;
  list_title: string | null;
  peer: string | null;
  members: string[];
  last_message_at_unix: number | null;
  unread_count: number;
  image: unknown;
  last_message_preview: string | null;
  last_message_encrypted?: boolean;
};

export type ChannelListPage = {
  items: ChannelListItem[];
  cursor: string | null;
  hasMore: boolean;
};

export type ChannelMemberView = {
  account: string;
  role: 'admin' | 'member';
};

export type ChannelLeavePolicy = {
  can_leave: boolean;
  requires_successor: boolean;
  eligible_successors: string[];
};

export type ChannelDetail = {
  channel_id: string;
  kind: string;
  creator: string;
  title: string | null;
  image: unknown;
  object_id: string | null;
  access: string;
  display_title: string | null;
  list_title: string | null;
  peer: string | null;
  members: ChannelMemberView[];
  viewer_role: 'admin' | 'member' | null;
  leave_policy: ChannelLeavePolicy;
};

export type MessageSourceObject = {
  object_id: string;
  name: string;
};

export type MessageSource = {
  platform: string;
  id: string;
};

export type MessageItem = {
  message_id: string;
  channel_id: string;
  author: string;
  body: string | null;
  encrypted_body: string | null;
  encryption: MessageEncryption | null;
  overflow_ref: string | null;
  reply_to: string | null;
  quote_json: unknown;
  attachments: unknown;
  mentions: string[];
  created_at_unix: number;
  original_created_at_unix: number | null;
  updated_at_unix: number | null;
  source_object: MessageSourceObject | null;
  /** Present on query-api message rows; omitted in older fixtures. */
  source?: MessageSource | null;
  duplicate_of?: string | null;
  duplicate_count?: number;
};

export type MessageHistoryPage = {
  items: MessageItem[];
  cursor: string | null;
  hasMore: boolean;
};

export type MessagingListFilter = 'all' | 'following';

export type SendMessageTarget =
  | { channelId: string; peer?: never }
  | { peer: string; channelId?: never };

export type SendEncryptedMessageInput = {
  ciphertext: string;
  mode: 'memo' | 'ephemeral';
  to: string;
};

export const PLAIN_SEND_DISCLAIMER_STORAGE_KEY =
  'odl:messaging:plain-send-disclaimer-v1';

export const EMPTY_LEAVE_POLICY: ChannelLeavePolicy = {
  can_leave: false,
  requires_successor: false,
  eligible_successors: [],
};

export type MessagingComposeReplyIntent = {
  mode: 'reply';
  message: MessageItem;
};

export type MessagingComposeEditIntent = {
  mode: 'edit';
  message: MessageItem;
};

export type MessagingComposeIntent =
  | MessagingComposeReplyIntent
  | MessagingComposeEditIntent
  | null;
