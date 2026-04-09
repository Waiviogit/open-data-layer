/**
 * Table schemas and row types for the PostgreSQL concept schema.
 * Table interfaces are used only in the `OdlDatabase` type; use
 * `Selectable`, `Insertable`, and `Updateable` types for queries.
 * @see docs/spec/data-model/schema.sql
 * @see docs/spec/data-model/flow.md
 * @see docs/spec/data-model/posts.md
 * @see docs/spec/data-model/users.md
 */

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Hive post beneficiary: `{ account: string; weight: number }`. */
export interface HiveBeneficiary {
  account: string;
  weight: number;
}

export interface OdlDatabase {
  objects_core: ObjectsCoreTable;
  object_updates: ObjectUpdatesTable;
  validity_votes: ValidityVotesTable;
  rank_votes: RankVotesTable;
  object_authority: ObjectAuthorityTable;
  accounts_current: AccountsCurrentTable;
  user_metadata: UserMetadataTable;
  user_notification_settings: UserNotificationSettingsTable;
  user_referrals: UserReferralsTable;
  user_post_bookmarks: UserPostBookmarksTable;
  user_subscriptions: UserSubscriptionsTable;
  user_object_follows: UserObjectFollowsTable;
  posts: PostsTable;
  post_active_votes: PostActiveVotesTable;
  post_objects: PostObjectsTable;
  post_reblogged_users: PostRebloggedUsersTable;
  post_languages: PostLanguagesTable;
  post_links: PostLinksTable;
  post_mentions: PostMentionsTable;
  user_post_drafts: UserPostDraftsTable;
}

// ---------------------------------------------------------------------------
// objects_core
// ---------------------------------------------------------------------------

export interface ObjectsCoreTable {
  object_id: string;
  object_type: string;
  creator: string;
  weight: number | null;
  meta_group_id: string | null;
  /** Normalized display name for search/sort; null if unset. */
  canonical: string | null;
  transaction_id: string;
  /** DEFAULT 0; optional on insert. */
  seq: ColumnType<number, number | undefined, number>;
}

export type ObjectsCore = Selectable<ObjectsCoreTable>;
export type NewObjectsCore = Insertable<ObjectsCoreTable>;
export type ObjectsCoreUpdate = Updateable<ObjectsCoreTable>;

// ---------------------------------------------------------------------------
// object_updates
// ---------------------------------------------------------------------------

export interface ObjectUpdatesTable {
  update_id: string;
  object_id: string;
  update_type: string;
  creator: string;
  /** BCP 47 tag, e.g. en-US. Null = language-neutral. */
  locale: string | null;
  created_at_unix: number;
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
  value_text: string | null;
  value_geo: unknown;
  value_json: ColumnType<JsonValue>;
  /** GENERATED ALWAYS AS (LOWER(TRIM(value_text))) STORED; read-only. */
  value_text_normalized: Generated<string | null>;
  search_vector: unknown;
}

export type ObjectUpdate = Selectable<ObjectUpdatesTable>;
export type NewObjectUpdate = Insertable<ObjectUpdatesTable>;
export type ObjectUpdateUpdate = Updateable<ObjectUpdatesTable>;

// ---------------------------------------------------------------------------
// validity_votes
// ---------------------------------------------------------------------------

export interface ValidityVotesTable {
  update_id: string;
  object_id: string;
  voter: string;
  vote: 'for' | 'against';
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
}

export type ValidityVote = Selectable<ValidityVotesTable>;
export type NewValidityVote = Insertable<ValidityVotesTable>;
export type ValidityVoteUpdate = Updateable<ValidityVotesTable>;


// ---------------------------------------------------------------------------
// rank_votes
// ---------------------------------------------------------------------------

export interface RankVotesTable {
  update_id: string;
  object_id: string;
  voter: string;
  rank: number;
  rank_context: string;
  /** Packed canonical order: block_num|trx_index|op_index|odl_event_index. See event-seq.ts. */
  event_seq: bigint;
  transaction_id: string;
}

export type RankVote = Selectable<RankVotesTable>;
export type NewRankVote = Insertable<RankVotesTable>;
export type RankVoteUpdate = Updateable<RankVotesTable>;

// ---------------------------------------------------------------------------
// object_authority
// ---------------------------------------------------------------------------

export interface ObjectAuthorityTable {
  object_id: string;
  account: string;
  authority_type: 'ownership' | 'administrative';
}

export type ObjectAuthority = Selectable<ObjectAuthorityTable>;
export type NewObjectAuthority = Insertable<ObjectAuthorityTable>;
export type ObjectAuthorityUpdate = Updateable<ObjectAuthorityTable>;

// ---------------------------------------------------------------------------
// accounts_current
// ---------------------------------------------------------------------------

export interface AccountsCurrentTable {
  name: string;
  hive_id: number | null;
  json_metadata: string | null;
  posting_json_metadata: string | null;
  created: string | null;
  comment_count: number;
  lifetime_vote_count: number;
  post_count: number;
  last_post: string | null;
  last_root_post: string | null;
  object_reputation: number;
  updated_at_unix: number | null;
  /** Waivio / legacy Mongo User fields. */
  alias: string | null;
  profile_image: string | null;
  wobjects_weight: number;
  last_posts_count: number;
  users_following_count: number;
  followers_count: number;
  stage_version: number;
  referral_status: string | null;
  /** Unix seconds; from Mongo lastActivity. */
  last_activity: number | null;
}

export type AccountCurrent = Selectable<AccountsCurrentTable>;
export type NewAccountCurrent = Insertable<AccountsCurrentTable>;
export type AccountCurrentUpdate = Updateable<AccountsCurrentTable>;

// ---------------------------------------------------------------------------
// user_metadata (1:1 accounts_current; UserMetadataSchema minus nested notifications)
// ---------------------------------------------------------------------------

export interface UserMetadataTable {
  account: string;
  notifications_last_timestamp: number;
  exit_page_setting: boolean;
  locale: string;
  post_locales: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  nightmode: boolean;
  reward_setting: 'HP' | '50' | 'HIVE';
  rewrite_links: boolean;
  show_nsfw_posts: boolean;
  upvote_setting: boolean;
  vote_percent: number;
  voting_power: boolean;
  currency: string | null;
}

export type UserMetadata = Selectable<UserMetadataTable>;
export type NewUserMetadata = Insertable<UserMetadataTable>;
export type UserMetadataUpdate = Updateable<UserMetadataTable>;

// ---------------------------------------------------------------------------
// user_notification_settings (UserNotificationsSchema)
// ---------------------------------------------------------------------------

export interface UserNotificationSettingsTable {
  account: string;
  activation_campaign: boolean;
  deactivation_campaign: boolean;
  follow: boolean;
  fill_order: boolean;
  mention: boolean;
  minimal_transfer: number;
  reblog: boolean;
  reply: boolean;
  status_change: boolean;
  transfer: boolean;
  power_up: boolean;
  witness_vote: boolean;
  my_post: boolean;
  my_comment: boolean;
  my_like: boolean;
  /** Maps Mongo `userNotifications.like` (PostgreSQL column `vote`; `like` is reserved). */
  vote: boolean;
  downvote: boolean;
  claim_reward: boolean;
}

export type UserNotificationSettings = Selectable<UserNotificationSettingsTable>;
export type NewUserNotificationSettings = Insertable<UserNotificationSettingsTable>;
export type UserNotificationSettingsUpdate = Updateable<UserNotificationSettingsTable>;

// ---------------------------------------------------------------------------
// user_referrals (ReferralsSchema)
// ---------------------------------------------------------------------------

export interface UserReferralsTable {
  account: string;
  agent: string;
  type: string;
  started_at: number | null;
  ended_at: number | null;
}

export type UserReferral = Selectable<UserReferralsTable>;
export type NewUserReferral = Insertable<UserReferralsTable>;
export type UserReferralUpdate = Updateable<UserReferralsTable>;

// ---------------------------------------------------------------------------
// user_post_bookmarks (post bookmarks from UserMetadataSchema.bookmarks)
// ---------------------------------------------------------------------------

export interface UserPostBookmarksTable {
  account: string;
  author: string;
  permlink: string;
}

export type UserPostBookmark = Selectable<UserPostBookmarksTable>;
export type NewUserPostBookmark = Insertable<UserPostBookmarksTable>;
export type UserPostBookmarkUpdate = Updateable<UserPostBookmarksTable>;

// ---------------------------------------------------------------------------
// user_subscriptions (SubscriptionSchema: user follows user)
// ---------------------------------------------------------------------------

export interface UserSubscriptionsTable {
  follower: string;
  following: string;
  bell: boolean | null;
}

export type UserSubscription = Selectable<UserSubscriptionsTable>;
export type NewUserSubscription = Insertable<UserSubscriptionsTable>;
export type UserSubscriptionUpdate = Updateable<UserSubscriptionsTable>;

// ---------------------------------------------------------------------------
// user_object_follows (UserSchema.objects_follow + bell)
// ---------------------------------------------------------------------------

export interface UserObjectFollowsTable {
  account: string;
  object_id: string;
  bell: boolean;
}

export type UserObjectFollow = Selectable<UserObjectFollowsTable>;
export type NewUserObjectFollow = Insertable<UserObjectFollowsTable>;
export type UserObjectFollowUpdate = Updateable<UserObjectFollowsTable>;

// ---------------------------------------------------------------------------
// posts (Hive post body; normalized from Mongo PostSchema)
// ---------------------------------------------------------------------------

export interface PostsTable {
  author: string;
  permlink: string;
  hive_id: number | null;
  author_reputation: bigint;
  author_weight: number;
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  app: string | null;
  depth: number | null;
  category: string | null;
  last_update: string | null;
  created: string | null;
  active: string | null;
  last_payout: string | null;
  children: number;
  net_rshares: bigint;
  abs_rshares: bigint;
  vote_rshares: bigint;
  children_abs_rshares: bigint | null;
  cashout_time: string | null;
  reward_weight: string | null;
  total_payout_value: string;
  curator_payout_value: string;
  author_rewards: number | null;
  net_votes: number | null;
  root_author: string;
  root_permlink: string;
  root_title: string | null;
  max_accepted_payout: string;
  percent_steem_dollars: number | null;
  allow_replies: boolean | null;
  allow_votes: boolean | null;
  allow_curation_rewards: boolean | null;
  /** Hive beneficiaries; small array stored inline. */
  beneficiaries: ColumnType<HiveBeneficiary[], HiveBeneficiary[] | undefined, HiveBeneficiary[]>;
  url: string | null;
  pending_payout_value: string;
  total_pending_payout_value: string;
  total_vote_weight: bigint | null;
  promoted: string | null;
  body_length: number | null;
  net_rshares_waiv: number;
  total_payout_waiv: number;
  total_rewards_waiv: number;
  /** Unix seconds for chronological feeds and sorting. */
  created_unix: number;
}

export type Post = Selectable<PostsTable>;
export type NewPost = Insertable<PostsTable>;
export type PostUpdate = Updateable<PostsTable>;

// ---------------------------------------------------------------------------
// post_active_votes
// ---------------------------------------------------------------------------

export interface PostActiveVotesTable {
  author: string;
  permlink: string;
  voter: string;
  weight: number | null;
  percent: number | null;
  rshares: bigint | null;
  rshares_waiv: number | null;
}

export type PostActiveVote = Selectable<PostActiveVotesTable>;
export type NewPostActiveVote = Insertable<PostActiveVotesTable>;
export type PostActiveVoteUpdate = Updateable<PostActiveVotesTable>;

// ---------------------------------------------------------------------------
// post_objects (posts ↔ objects_core)
// ---------------------------------------------------------------------------

export interface PostObjectsTable {
  author: string;
  permlink: string;
  object_id: string;
  percent: number | null;
  tagged: string | null;
  /** Denormalized from objects_core for filters without JOIN. */
  object_type: string | null;
}

export type PostObject = Selectable<PostObjectsTable>;
export type NewPostObject = Insertable<PostObjectsTable>;
export type PostObjectUpdate = Updateable<PostObjectsTable>;

// ---------------------------------------------------------------------------
// post_reblogged_users
// ---------------------------------------------------------------------------

export interface PostRebloggedUsersTable {
  author: string;
  permlink: string;
  account: string;
  /** When this account reblogged; used for user feed ordering. */
  reblogged_at_unix: number;
}

export type PostRebloggedUser = Selectable<PostRebloggedUsersTable>;
export type NewPostRebloggedUser = Insertable<PostRebloggedUsersTable>;
export type PostRebloggedUserUpdate = Updateable<PostRebloggedUsersTable>;

// ---------------------------------------------------------------------------
// post_languages
// ---------------------------------------------------------------------------

export interface PostLanguagesTable {
  author: string;
  permlink: string;
  /** BCP 47 tag, e.g. en-US. */
  language: string;
}

export type PostLanguage = Selectable<PostLanguagesTable>;
export type NewPostLanguage = Insertable<PostLanguagesTable>;
export type PostLanguageUpdate = Updateable<PostLanguagesTable>;

// ---------------------------------------------------------------------------
// post_links
// ---------------------------------------------------------------------------

export interface PostLinksTable {
  author: string;
  permlink: string;
  url: string;
}

export type PostLink = Selectable<PostLinksTable>;
export type NewPostLink = Insertable<PostLinksTable>;
export type PostLinkUpdate = Updateable<PostLinksTable>;

// ---------------------------------------------------------------------------
// post_mentions
// ---------------------------------------------------------------------------

export interface PostMentionsTable {
  author: string;
  permlink: string;
  account: string;
}

export type PostMention = Selectable<PostMentionsTable>;
export type NewPostMention = Insertable<PostMentionsTable>;
export type PostMentionUpdate = Updateable<PostMentionsTable>;

// ---------------------------------------------------------------------------
// user_post_drafts
// ---------------------------------------------------------------------------

export interface UserPostDraftsTable {
  author: string;
  draft_id: string;
  title: string;
  body: string;
  json_metadata: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  parent_author: string;
  parent_permlink: string;
  permlink: string | null;
  beneficiaries: ColumnType<HiveBeneficiary[], HiveBeneficiary[] | undefined, HiveBeneficiary[]>;
  last_updated: number;
}

export type UserPostDraft = Selectable<UserPostDraftsTable>;
export type NewUserPostDraft = Insertable<UserPostDraftsTable>;
export type UserPostDraftUpdate = Updateable<UserPostDraftsTable>;
