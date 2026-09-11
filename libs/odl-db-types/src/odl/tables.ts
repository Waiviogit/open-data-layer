/**
 * Table schemas and row types for the PostgreSQL concept schema.
 * Table interfaces are used only in the `OdlDatabase` type; use
 * `Selectable`, `Insertable`, and `Updateable` types for queries.
 * @see docs/spec/data-model/schema.sql
 * @see docs/spec/data-model/flow.md
 * @see docs/spec/data-model/posts.md
 * @see docs/spec/data-model/threads.md
 * @see docs/spec/data-model/users.md
 */

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';
import type { ObjectStatus } from '../object-status';
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
  user_object_powers: UserObjectPowersTable;
  user_waiv_power_history: UserWaivPowerHistoryTable;
  object_favorite: ObjectFavoriteTable;
  object_ownership: ObjectOwnershipTable;
  accounts_current: AccountsCurrentTable;
  user_metadata: UserMetadataTable;
  user_notification_settings: UserNotificationSettingsTable;
  telegram_subscriptions: TelegramSubscriptionsTable;
  ops_telegram_subscribers: OpsTelegramSubscribersTable;
  user_referrals: UserReferralsTable;
  user_post_bookmarks: UserPostBookmarksTable;
  user_subscriptions: UserSubscriptionsTable;
  user_delegations: UserDelegationsTable;
  user_rc_delegations: UserRcDelegationsTable;
  user_account_auths: UserAccountAuthsTable;
  user_account_auth_sync: UserAccountAuthSyncTable;
  user_account_mutes: UserAccountMutesTable;
  user_object_follows: UserObjectFollowsTable;
  user_object_expertise: UserObjectExpertiseTable;
  user_shop_deselect: UserShopDeselectTable;
  posts: PostsTable;
  post_active_votes: PostActiveVotesTable;
  post_objects: PostObjectsTable;
  post_object_related_images: PostObjectRelatedImagesTable;
  post_reblogged_users: PostRebloggedUsersTable;
  post_languages: PostLanguagesTable;
  post_links: PostLinksTable;
  post_mentions: PostMentionsTable;
  post_replies: PostRepliesTable;
  user_post_drafts: UserPostDraftsTable;
  threads: ThreadsTable;
  thread_replies: ThreadRepliesTable;
  thread_active_votes: ThreadActiveVotesTable;
  post_sync_queue: PostSyncQueueTable;
  account_sync_queue: AccountSyncQueueTable;
  scheduler_job_runs: SchedulerJobRunsTable;
  scheduler_job_queue: SchedulerJobQueueTable;
  site_registry: SiteRegistryTable;
  canonical_recompute_queue: CanonicalRecomputeQueueTable;
  object_categories: ObjectCategoriesTable;
  object_categories_sync_queue: ObjectCategoriesSyncQueueTable;
  object_categories_related: ObjectCategoriesRelatedTable;
  object_categories_related_sync_queue: ObjectCategoriesRelatedSyncQueueTable;
  object_tag_category_items: ObjectTagCategoryItemsTable;
  object_tag_categories_sync_queue: ObjectTagCategoriesSyncQueueTable;
  currency_rates: CurrencyRatesTable;
  currency_statistics: CurrencyStatisticsTable;
  hive_engine_rates: HiveEngineRatesTable;
  hive_engine_swap_pool_usd: HiveEngineSwapPoolUsdTable;
  wallet_exemptions: WalletExemptionsTable;
  hive_engine_swaps: HiveEngineSwapsTable;
  hive_engine_waiv_airdrops: HiveEngineWaivAirdropsTable;
  hive_engine_deposit_records: HiveEngineDepositRecordsTable;
  waiv_generated_reports: WaivGeneratedReportsTable;
  waiv_generated_report_rows: WaivGeneratedReportRowsTable;
  obl_offers: OblOffersTable;
  obl_contracts: OblContractsTable;
  obl_invoices: OblInvoicesTable;
  obl_obligation_lines: OblObligationLinesTable;
  obl_ledgers: OblLedgersTable;
  obl_payments: OblPaymentsTable;
  obl_disputes: OblDisputesTable;
  obl_service_orders: OblServiceOrdersTable;
  obl_reports: OblReportsTable;
  obl_offer_drafts: OblOfferDraftsTable;
  channels: ChannelsTable;
  channel_members: ChannelMembersTable;
  channel_aliases: ChannelAliasesTable;
  messages: MessagesTable;
  message_tombstones: MessageTombstonesTable;
  message_context_exclusions: MessageContextExclusionsTable;
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
  /**
   * Normalized site URL for SEO (`https://...` only). Legacy display names were cleared in migration 00003.
   */
  canonical: string | null;
  /** Hive account of winning @en-US `description` author; used for bulk updates with site_registry. */
  canonical_creator: string | null;
  transaction_id: string;
  /** DEFAULT `active`; optional on insert. */
  status: ColumnType<ObjectStatus, ObjectStatus | undefined, ObjectStatus>;
  /** DEFAULT 0; optional on insert. */
  seq: ColumnType<number, number | undefined, number>;
  /**
   * Timestamp of object creation. DEFAULT NOW() on the DB level.
   * On insert from blockchain: pass ctx.timestamp. On legacy insert: optional (defaults to NOW()).
   */
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
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
  /** 0..10000; computed at indexer from rank_votes + governance + waiv_power. */
  rank_score: number | null;
  rank_context: string | null;
  /** event_seq of decisive rank vote when applicable; tie-break at read time. */
  rank_decisive_event_seq: bigint | null;
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
// user_object_powers
// ---------------------------------------------------------------------------

export interface UserObjectPowersTable {
  account: string;
  /** 30-day time-weighted average used for vote weight (updated by scheduler). */
  waiv_power: number;
  /** Live Hive Engine WAIV stake + delegationsIn (updated on chain events). */
  raw_waiv_power: number;
  /** Set when raw_waiv_power changes; cleared after daily history snapshot. */
  waiv_power_dirty: boolean;
}

export type UserObjectPower = Selectable<UserObjectPowersTable>;
export type NewUserObjectPower = Insertable<UserObjectPowersTable>;
export type UserObjectPowerUpdate = Updateable<UserObjectPowersTable>;

// ---------------------------------------------------------------------------
// user_waiv_power_history
// ---------------------------------------------------------------------------

export interface UserWaivPowerHistoryTable {
  id: Generated<number>;
  account: string;
  waiv_power: number;
  recorded_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type UserWaivPowerHistory = Selectable<UserWaivPowerHistoryTable>;
export type NewUserWaivPowerHistory = Insertable<UserWaivPowerHistoryTable>;
export type UserWaivPowerHistoryUpdate = Updateable<UserWaivPowerHistoryTable>;

// ---------------------------------------------------------------------------
// object_favorite
// ---------------------------------------------------------------------------

export interface ObjectFavoriteTable {
  object_id: string;
  account: string;
  event_seq: bigint;
  created_at: ColumnType<Date, Date | string, Date | string>;
}

export type ObjectFavorite = Selectable<ObjectFavoriteTable>;
export type NewObjectFavorite = Insertable<ObjectFavoriteTable>;
export type ObjectFavoriteUpdate = Updateable<ObjectFavoriteTable>;

// ---------------------------------------------------------------------------
// object_ownership
// ---------------------------------------------------------------------------

export type ObjectOwnershipType = 'exclusive' | 'supervised';

export interface ObjectOwnershipTable {
  object_id: string;
  account: string;
  ownership_type: ObjectOwnershipType;
  event_seq: bigint;
  created_at: ColumnType<Date, Date | string, Date | string>;
}

export type ObjectOwnership = Selectable<ObjectOwnershipTable>;
export type NewObjectOwnership = Insertable<ObjectOwnershipTable>;
export type ObjectOwnershipUpdate = Updateable<ObjectOwnershipTable>;

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
  /** When true, exclude objects linked only via `post_objects` from shop category scope (book/product bucket). */
  hide_linked_objects: boolean;
  /** When true, exclude recipe objects linked via `post_objects` from the recipe bucket. */
  hide_recipe_objects: boolean;
  /** When true, exclude post-linked objects from favorites scope. */
  hide_favorite_objects: boolean;
  profile_posts_last_read_at_unix: number | null;
  profile_threads_last_read_at_unix: number | null;
}

export type UserMetadata = Selectable<UserMetadataTable>;
export type NewUserMetadata = Insertable<UserMetadataTable>;
export type UserMetadataUpdate = Updateable<UserMetadataTable>;

// ---------------------------------------------------------------------------
// user_shop_deselect (manual hide for post-linked objects only; cleared when authority added)
// ---------------------------------------------------------------------------

export interface UserShopDeselectTable {
  account: string;
  object_id: string;
}

export type UserShopDeselect = Selectable<UserShopDeselectTable>;
export type NewUserShopDeselect = Insertable<UserShopDeselectTable>;
export type UserShopDeselectUpdate = Updateable<UserShopDeselectTable>;

// ---------------------------------------------------------------------------
// user_notification_settings (UserNotificationsSchema)
// ---------------------------------------------------------------------------

export interface UserNotificationSettingsTable {
  account: string;
  deactivation_campaign: boolean;
  follow: boolean;
  fill_order: boolean;
  mention: boolean;
  minimal_transfer: number;
  reblog: boolean;
  reply: boolean;
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
  claimed_object_updates: boolean;
  group_id_control: boolean;
  followed_user_threads: boolean;
  messages: boolean;
  obl: boolean;
}

export type UserNotificationSettings = Selectable<UserNotificationSettingsTable>;
export type NewUserNotificationSettings = Insertable<UserNotificationSettingsTable>;
export type UserNotificationSettingsUpdate = Updateable<UserNotificationSettingsTable>;

// ---------------------------------------------------------------------------
// telegram_subscriptions (Telegram notifications channel)
// ---------------------------------------------------------------------------

export interface TelegramSubscriptionsTable {
  chat_id: string;
  account: string;
  created_at: number;
}

export type TelegramSubscription = Selectable<TelegramSubscriptionsTable>;
export type NewTelegramSubscription = Insertable<TelegramSubscriptionsTable>;

// ---------------------------------------------------------------------------
// ops_telegram_subscribers (Telegram ops / system alerts channel)
// ---------------------------------------------------------------------------

export interface OpsTelegramSubscribersTable {
  chat_id: string;
  created_at: number;
}

export type OpsTelegramSubscriber = Selectable<OpsTelegramSubscribersTable>;
export type NewOpsTelegramSubscriber = Insertable<OpsTelegramSubscribersTable>;

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
  /** When the follow relationship was recorded (chain event or migration). */
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type UserSubscription = Selectable<UserSubscriptionsTable>;
export type NewUserSubscription = Insertable<UserSubscriptionsTable>;
export type UserSubscriptionUpdate = Updateable<UserSubscriptionsTable>;

// ---------------------------------------------------------------------------
// user_delegations (Hive HP vesting delegations)
// ---------------------------------------------------------------------------

export interface UserDelegationsTable {
  delegator: string;
  delegatee: string;
  vesting_shares: number;
  delegation_date: Date | null;
}

export type UserDelegation = Selectable<UserDelegationsTable>;
export type NewUserDelegation = Insertable<UserDelegationsTable>;
export type UserDelegationUpdate = Updateable<UserDelegationsTable>;

// ---------------------------------------------------------------------------
// user_rc_delegations (Hive RC delegations)
// ---------------------------------------------------------------------------

export interface UserRcDelegationsTable {
  delegator: string;
  delegatee: string;
  rc: string;
}

export type UserRcDelegation = Selectable<UserRcDelegationsTable>;
export type NewUserRcDelegation = Insertable<UserRcDelegationsTable>;
export type UserRcDelegationUpdate = Updateable<UserRcDelegationsTable>;

// ---------------------------------------------------------------------------
// user_account_auths (Hive account_auths reverse index)
// ---------------------------------------------------------------------------

export type HiveAccountAuthorityType = 'owner' | 'active' | 'posting';

export interface UserAccountAuthsTable {
  grantor: string;
  authority_type: HiveAccountAuthorityType;
  grantee: string;
  updated_at_block: number;
}

export type UserAccountAuth = Selectable<UserAccountAuthsTable>;
export type NewUserAccountAuth = Insertable<UserAccountAuthsTable>;
export type UserAccountAuthUpdate = Updateable<UserAccountAuthsTable>;

export interface UserAccountAuthSyncTable {
  account: string;
  synced_at: Date;
  synced_block: number;
}

export type UserAccountAuthSync = Selectable<UserAccountAuthSyncTable>;
export type NewUserAccountAuthSync = Insertable<UserAccountAuthSyncTable>;
export type UserAccountAuthSyncUpdate = Updateable<UserAccountAuthSyncTable>;

// ---------------------------------------------------------------------------
// user_account_mutes (Hive follow ignore — pair-level social mute)
// ---------------------------------------------------------------------------

export interface UserAccountMutesTable {
  muter: string;
  muted: string;
}

export type UserAccountMute = Selectable<UserAccountMutesTable>;
export type NewUserAccountMute = Insertable<UserAccountMutesTable>;
export type UserAccountMuteUpdate = Updateable<UserAccountMutesTable>;

// ---------------------------------------------------------------------------
// user_object_follows (UserSchema.objects_follow + bell)
// ---------------------------------------------------------------------------

export interface UserObjectFollowsTable {
  account: string;
  object_id: string;
  bell: boolean;
  /** When the object follow was recorded (migration backfill or future writes). */
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type UserObjectFollow = Selectable<UserObjectFollowsTable>;
export type NewUserObjectFollow = Insertable<UserObjectFollowsTable>;
export type UserObjectFollowUpdate = Updateable<UserObjectFollowsTable>;

// ---------------------------------------------------------------------------
// user_object_expertise (per-user per-object post-author expertise)
// ---------------------------------------------------------------------------

export interface UserObjectExpertiseTable {
  account: string;
  object_id: string;
  weight: number;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type UserObjectExpertise = Selectable<UserObjectExpertiseTable>;
export type NewUserObjectExpertise = Insertable<UserObjectExpertiseTable>;
export type UserObjectExpertiseUpdate = Updateable<UserObjectExpertiseTable>;

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
  /** Set once post-cashout reward finalization completes. */
  rewards_finalized_at: string | null;
  /** Set once post-author expertise has been applied (including Mongo import seed). */
  expertise_applied_at: string | null;
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
  /** Denormalized from objects_core for filters without JOIN. */
  object_type: string | null;
}

export type PostObject = Selectable<PostObjectsTable>;
export type NewPostObject = Insertable<PostObjectsTable>;
export type PostObjectUpdate = Updateable<PostObjectsTable>;

// ---------------------------------------------------------------------------
// post_object_related_images
// ---------------------------------------------------------------------------

export interface PostObjectRelatedImagesTable {
  object_id: string;
  author: string;
  permlink: string;
  image_url: string;
  sort_ord: number;
}

export type PostObjectRelatedImage = Selectable<PostObjectRelatedImagesTable>;
export type NewPostObjectRelatedImage = Insertable<PostObjectRelatedImagesTable>;
export type PostObjectRelatedImageUpdate =
  Updateable<PostObjectRelatedImagesTable>;

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
  /** Primary language subtag (BCP-47 language code), e.g. `en`. */
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
// post_replies (Hive comment replies for unread counts)
// ---------------------------------------------------------------------------

export interface PostRepliesTable {
  author: string;
  permlink: string;
  root_author: string;
  root_permlink: string;
  parent_author: string;
  parent_permlink: string;
  created_unix: number;
}

export type PostReply = Selectable<PostRepliesTable>;
export type NewPostReply = Insertable<PostRepliesTable>;
export type PostReplyUpdate = Updateable<PostRepliesTable>;

// ---------------------------------------------------------------------------
// threads (Leo / Ecency thread-style comments)
// ---------------------------------------------------------------------------

export interface ThreadsTable {
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  body: string;
  created: string | null;
  replies: ColumnType<string[], string[] | undefined, string[]>;
  children: number;
  depth: number;
  author_reputation: bigint | null;
  deleted: boolean;
  tickers: ColumnType<string[], string[] | undefined, string[]>;
  mentions: ColumnType<string[], string[] | undefined, string[]>;
  hashtags: ColumnType<string[], string[] | undefined, string[]>;
  links: ColumnType<string[], string[] | undefined, string[]>;
  images: ColumnType<string[], string[] | undefined, string[]>;
  threadstorm: boolean;
  net_rshares: bigint | null;
  pending_payout_value: string | null;
  total_payout_value: string | null;
  percent_hbd: number | null;
  cashout_time: string | null;
  bulk_message: boolean;
  /** Leo vs Ecency thread flavour. */
  type: 'leothreads' | 'ecencythreads';
  created_unix: number;
  updated_at_unix: number | null;
}

export type Thread = Selectable<ThreadsTable>;
export type NewThread = Insertable<ThreadsTable>;
export type ThreadUpdate = Updateable<ThreadsTable>;

// ---------------------------------------------------------------------------
// thread_replies (nested thread replies for unread counts)
// ---------------------------------------------------------------------------

export interface ThreadRepliesTable {
  author: string;
  permlink: string;
  parent_author: string;
  parent_permlink: string;
  created_unix: number;
}

export type ThreadReply = Selectable<ThreadRepliesTable>;
export type NewThreadReply = Insertable<ThreadRepliesTable>;
export type ThreadReplyUpdate = Updateable<ThreadRepliesTable>;

// ---------------------------------------------------------------------------
// thread_active_votes
// ---------------------------------------------------------------------------

export interface ThreadActiveVotesTable {
  author: string;
  permlink: string;
  voter: string;
  weight: number | null;
  percent: number | null;
  rshares: bigint | null;
  rshares_waiv: number | null;
}

export type ThreadActiveVote = Selectable<ThreadActiveVotesTable>;
export type NewThreadActiveVote = Insertable<ThreadActiveVotesTable>;
export type ThreadActiveVoteUpdate = Updateable<ThreadActiveVotesTable>;

// ---------------------------------------------------------------------------
// post_sync_queue (chain-indexer Hive vote / rshares sync)
// ---------------------------------------------------------------------------

export interface PostSyncQueueTable {
  author: string;
  permlink: string;
  enqueued_at: number;
  needs_post_create: boolean;
  attempts: number;
  last_attempt_at: number | null;
}

export type PostSyncQueueRow = Selectable<PostSyncQueueTable>;
export type NewPostSyncQueueRow = Insertable<PostSyncQueueTable>;
export type PostSyncQueueRowUpdate = Updateable<PostSyncQueueTable>;

// ---------------------------------------------------------------------------
// account_sync_queue (chain-indexer Hive account recovery)
// ---------------------------------------------------------------------------

export interface AccountSyncQueueTable {
  account_name: string;
  enqueued_at: number;
  attempts: number;
  last_attempt_at: number | null;
}

export type AccountSyncQueueRow = Selectable<AccountSyncQueueTable>;
export type NewAccountSyncQueueRow = Insertable<AccountSyncQueueTable>;
export type AccountSyncQueueRowUpdate = Updateable<AccountSyncQueueTable>;

// ---------------------------------------------------------------------------
// scheduler_job_runs (apps/scheduler run metadata)
// ---------------------------------------------------------------------------

export interface SchedulerJobRunsTable {
  id: Generated<string>;
  job_name: string;
  trigger: 'scheduled' | 'manual' | 'retry';
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  attempt: number;
  started_at: Date | null;
  finished_at: Date | null;
  duration_ms: number | null;
  error: string | null;
  payload: ColumnType<JsonValue, JsonValue | null | undefined, JsonValue | null>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SchedulerJobRun = Selectable<SchedulerJobRunsTable>;
export type NewSchedulerJobRun = Insertable<SchedulerJobRunsTable>;
export type SchedulerJobRunUpdate = Updateable<SchedulerJobRunsTable>;

// ---------------------------------------------------------------------------
// scheduler_job_queue (Postgres-backed queue for scheduler workers)
// ---------------------------------------------------------------------------

export interface SchedulerJobQueueTable {
  id: Generated<string>;
  run_id: string;
  job_name: string;
  status: 'pending' | 'claimed' | 'done' | 'dead';
  available_at: Date;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  claimed_at: Date | null;
}

export type SchedulerJobQueueRow = Selectable<SchedulerJobQueueTable>;
export type NewSchedulerJobQueueRow = Insertable<SchedulerJobQueueTable>;
export type SchedulerJobQueueRowUpdate = Updateable<SchedulerJobQueueTable>;

// ---------------------------------------------------------------------------
// site_registry (per-creator site state; scheduler daily + indexer)
// ---------------------------------------------------------------------------

export interface SiteRegistryTable {
  creator: string;
  website_raw: string | null;
  website_normalized: string | null;
  effective_canonical: string | null;
  site_state: 'active' | 'fallback';
  is_reachable: boolean;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  consecutive_fail_count: number;
  http_status_code: number | null;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SiteRegistryRow = Selectable<SiteRegistryTable>;
export type NewSiteRegistryRow = Insertable<SiteRegistryTable>;
export type SiteRegistryRowUpdate = Updateable<SiteRegistryTable>;

// ---------------------------------------------------------------------------
// canonical_recompute_queue (chain-indexer dedup by object_id)
// ---------------------------------------------------------------------------

export interface CanonicalRecomputeQueueTable {
  object_id: string;
  enqueued_at: Date;
  attempts: number;
}

export type CanonicalRecomputeQueueRow = Selectable<CanonicalRecomputeQueueTable>;
export type NewCanonicalRecomputeQueueRow = Insertable<CanonicalRecomputeQueueTable>;
export type CanonicalRecomputeQueueRowUpdate = Updateable<CanonicalRecomputeQueueTable>;

// ---------------------------------------------------------------------------
// object_categories (materialized CATEGORY field; chain-indexer)
// ---------------------------------------------------------------------------

export interface ObjectCategoriesTable {
  object_id: string;
  meta_group_id: string | null;
  category_names: ColumnType<string[], string[] | undefined, string[]>;
  updated_at_seq: bigint;
}

export type ObjectCategoriesRow = Selectable<ObjectCategoriesTable>;
export type NewObjectCategoriesRow = Insertable<ObjectCategoriesTable>;
export type ObjectCategoriesRowUpdate = Updateable<ObjectCategoriesTable>;

// ---------------------------------------------------------------------------
// object_categories_sync_queue
// ---------------------------------------------------------------------------

export interface ObjectCategoriesSyncQueueTable {
  object_id: string;
  enqueued_at: number;
  attempts: number;
  last_attempt_at: number | null;
}

export type ObjectCategoriesSyncQueueRow = Selectable<ObjectCategoriesSyncQueueTable>;
export type NewObjectCategoriesSyncQueueRow = Insertable<ObjectCategoriesSyncQueueTable>;

// ---------------------------------------------------------------------------
// object_categories_related (per-scope aggregates for navigation)
// ---------------------------------------------------------------------------

export type ObjectCategoriesRelatedScopeType = 'global' | 'user';

export interface ObjectCategoriesRelatedTable {
  scope_type: ObjectCategoriesRelatedScopeType;
  scope_key: string;
  category_name: string;
  objects_count: number | bigint;
  group_keys: ColumnType<string[], string[] | undefined, string[]>;
  related_names: ColumnType<string[], string[] | undefined, string[]>;
}

export type ObjectCategoriesRelatedRow = Selectable<ObjectCategoriesRelatedTable>;
export type NewObjectCategoriesRelatedRow = Insertable<ObjectCategoriesRelatedTable>;
export type ObjectCategoriesRelatedRowUpdate = Updateable<ObjectCategoriesRelatedTable>;

// ---------------------------------------------------------------------------
// object_categories_related_sync_queue
// ---------------------------------------------------------------------------

export interface ObjectCategoriesRelatedSyncQueueTable {
  scope_type: ObjectCategoriesRelatedScopeType;
  scope_key: string;
  enqueued_at: number;
  attempts: number;
  last_attempt_at: number | null;
}

export type ObjectCategoriesRelatedSyncQueueRow = Selectable<ObjectCategoriesRelatedSyncQueueTable>;
export type NewObjectCategoriesRelatedSyncQueueRow =
  Insertable<ObjectCategoriesRelatedSyncQueueTable>;

// ---------------------------------------------------------------------------
// object_tag_category_items (materialized tagCategoryItem; chain-indexer)
// ---------------------------------------------------------------------------

export interface ObjectTagCategoryItemsTable {
  object_id: string;
  object_type: string;
  category: string;
  value: string;
}

export type ObjectTagCategoryItemsRow = Selectable<ObjectTagCategoryItemsTable>;
export type NewObjectTagCategoryItemsRow = Insertable<ObjectTagCategoryItemsTable>;

// ---------------------------------------------------------------------------
// object_tag_categories_sync_queue
// ---------------------------------------------------------------------------

export interface ObjectTagCategoriesSyncQueueTable {
  object_id: string;
  enqueued_at: number;
  attempts: number;
  last_attempt_at: number | null;
}

export type ObjectTagCategoriesSyncQueueRow = Selectable<ObjectTagCategoriesSyncQueueTable>;
export type NewObjectTagCategoriesSyncQueueRow = Insertable<ObjectTagCategoriesSyncQueueTable>;

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

// ---------------------------------------------------------------------------
// currency_rates (FIAT; daily USD base — legacy currencies-service)
// ---------------------------------------------------------------------------

export interface CurrencyRatesTable {
  id: Generated<bigint>;
  base: string;
  date: ColumnType<string, string | Date, string | Date>;
  cad: number;
  eur: number;
  aud: number;
  mxn: number;
  gbp: number;
  jpy: number;
  cny: number;
  rub: number;
  uah: number;
  chf: number;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type CurrencyRatesRow = Selectable<CurrencyRatesTable>;
export type NewCurrencyRatesRow = Insertable<CurrencyRatesTable>;
export type CurrencyRatesRowUpdate = Updateable<CurrencyRatesTable>;

// ---------------------------------------------------------------------------
// currency_statistics (CoinGecko HIVE + HBD; 5m + daily aggregates)
// ---------------------------------------------------------------------------

export interface CurrencyStatisticsTable {
  id: Generated<bigint>;
  is_daily: boolean;
  hive_usd: number;
  hive_usd_24h_change: number;
  hive_btc: number;
  hive_btc_24h_change: number;
  hbd_usd: number;
  hbd_usd_24h_change: number;
  hbd_btc: number;
  hbd_btc_24h_change: number;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type CurrencyStatisticsRow = Selectable<CurrencyStatisticsTable>;
export type NewCurrencyStatisticsRow = Insertable<CurrencyStatisticsTable>;
export type CurrencyStatisticsRowUpdate = Updateable<CurrencyStatisticsTable>;

// ---------------------------------------------------------------------------
// hive_engine_rates (WAIV vs HIVE/USD; 5m samples + daily aggregates)
// ---------------------------------------------------------------------------

export interface HiveEngineRatesTable {
  id: Generated<bigint>;
  base: string;
  is_daily: boolean;
  date: ColumnType<string, string | Date, string | Date>;
  rate_hive: number;
  rate_usd: number;
  change_24h_hive: number | null;
  change_24h_usd: number | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HiveEngineRatesRow = Selectable<HiveEngineRatesTable>;
export type NewHiveEngineRatesRow = Insertable<HiveEngineRatesTable>;
export type HiveEngineRatesRowUpdate = Updateable<HiveEngineRatesTable>;

// ---------------------------------------------------------------------------
// hive_engine_swap_pool_usd (scheduler SWAP.* USD snapshots; 5m)
// ---------------------------------------------------------------------------

export interface HiveEngineSwapPoolUsdTable {
  symbol: string;
  usd: number;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HiveEngineSwapPoolUsdRow = Selectable<HiveEngineSwapPoolUsdTable>;
export type NewHiveEngineSwapPoolUsdRow = Insertable<HiveEngineSwapPoolUsdTable>;

// ---------------------------------------------------------------------------
// wallet_exemptions (advanced report row exclusions per viewer)
// ---------------------------------------------------------------------------

export interface WalletExemptionsTable {
  viewer: string;
  account: string;
  operation_index: number;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type WalletExemptionRow = Selectable<WalletExemptionsTable>;
export type NewWalletExemptionRow = Insertable<WalletExemptionsTable>;

// ---------------------------------------------------------------------------
// hive_engine_swaps (atomic marketpools swapTokens from HE logs)
// ---------------------------------------------------------------------------

export interface HiveEngineSwapsTable {
  id: Generated<bigint>;
  account: string;
  transaction_id: string;
  block_number: number;
  ref_hive_block_number: number | null;
  block_timestamp: ColumnType<Date, Date | string, Date | string>;
  symbol_out: string;
  symbol_in: string;
  symbol_out_quantity: string;
  symbol_in_quantity: string;
  symbols: Generated<string[]>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HiveEngineSwap = Selectable<HiveEngineSwapsTable>;
export type NewHiveEngineSwap = Insertable<HiveEngineSwapsTable>;
export type HiveEngineSwapUpdate = Updateable<HiveEngineSwapsTable>;

// ---------------------------------------------------------------------------
// hive_engine_waiv_airdrops (historical WAIV airdrops; Mongo import only)
// ---------------------------------------------------------------------------

export interface HiveEngineWaivAirdropsTable {
  id: Generated<bigint>;
  account: string;
  transaction_id: string;
  block_number: number;
  ref_hive_block_number: number;
  block_timestamp: ColumnType<Date, Date | string, Date | string>;
  quantity: string;
  token_state: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HiveEngineWaivAirdrop = Selectable<HiveEngineWaivAirdropsTable>;
export type NewHiveEngineWaivAirdrop = Insertable<HiveEngineWaivAirdropsTable>;
export type HiveEngineWaivAirdropUpdate = Updateable<HiveEngineWaivAirdropsTable>;

// ---------------------------------------------------------------------------
// hive_engine_deposit_records (OSL hive_engine_deposit + legacy Mongo import)
// ---------------------------------------------------------------------------

export interface HiveEngineDepositRecordsTable {
  id: Generated<bigint>;
  account: string;
  transaction_id: string;
  ref_hive_block_number: number;
  block_timestamp: ColumnType<Date, Date | string, Date | string>;
  destination: string;
  symbol_in: string;
  symbol_out: string;
  pair: string;
  ex_rate: number;
  deposit_account: string | null;
  address: string | null;
  memo: string | null;
  symbols: Generated<string[]>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HiveEngineDepositRecord = Selectable<HiveEngineDepositRecordsTable>;
export type NewHiveEngineDepositRecord = Insertable<HiveEngineDepositRecordsTable>;
export type HiveEngineDepositRecordUpdate = Updateable<HiveEngineDepositRecordsTable>;

// ---------------------------------------------------------------------------
// waiv_generated_reports (async WAIV advanced report jobs)
// ---------------------------------------------------------------------------

export type WaivGeneratedReportStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'stopped';

export type WaivGeneratedReportAccountProgress = {
  name: string;
  cursor: string | null;
  hasMore: boolean;
};

export interface WaivGeneratedReportsTable {
  id: Generated<string>;
  owner: string;
  profile_account: string;
  status: WaivGeneratedReportStatus;
  currency: string;
  start_date_ts: number;
  end_date_ts: number;
  filter_accounts: string[];
  include_swaps_and_trades: boolean;
  merge_rewards: boolean;
  accounts_progress: ColumnType<
    WaivGeneratedReportAccountProgress[],
    JsonValue | WaivGeneratedReportAccountProgress[],
    JsonValue | WaivGeneratedReportAccountProgress[]
  >;
  merge_reward_fold: ColumnType<JsonValue | null, JsonValue | null, JsonValue | null>;
  deposits: ColumnType<string, number | string, number | string>;
  withdrawals: ColumnType<string, number | string, number | string>;
  row_count: number;
  error_message: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  completed_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
}

export type WaivGeneratedReport = Selectable<WaivGeneratedReportsTable>;
export type NewWaivGeneratedReport = Insertable<WaivGeneratedReportsTable>;
export type WaivGeneratedReportUpdate = Updateable<WaivGeneratedReportsTable>;

export interface WaivGeneratedReportRowsTable {
  id: Generated<bigint>;
  report_id: string;
  operation_index: number;
  timestamp: number;
  user_name: string;
  checked: boolean;
  row: ColumnType<JsonValue, JsonValue, JsonValue>;
}

export type WaivGeneratedReportStoredRow = Selectable<WaivGeneratedReportRowsTable>;
export type NewWaivGeneratedReportStoredRow = Insertable<WaivGeneratedReportRowsTable>;

// ---------------------------------------------------------------------------
// OBL (Open Business Layer)
// ---------------------------------------------------------------------------

export type OblOfferKind = 'offer' | 'request';
export type OblOfferStatus = 'active' | 'retired';
export type OblDisputeRule = 'client' | 'provider' | 'arbiter';
export type OblInvoiceState =
  | 'confirmed'
  | 'pending'
  | 'disputed'
  | 'resolved'
  | 'void';
export type OblInvoiceKind = 'single' | 'multi';
export type OblPaymentMethod = 'token_transfer' | 'upvote_reward' | 'offchain';
export type OblPaymentState = 'confirmed' | 'pending';
export type OblDisputeStatus = 'open' | 'resolved';

export interface OblOffersTable {
  offer_id: string;
  version: number;
  kind: OblOfferKind;
  author: string;
  name: string;
  description: string | null;
  tags: ColumnType<string[], string[] | undefined, string[]>;
  service_ref: string | null;
  legal_ref: string | null;
  terms: ColumnType<JsonValue>;
  dispute_rule: OblDisputeRule;
  arbiter: string | null;
  status: ColumnType<OblOfferStatus, OblOfferStatus | undefined, OblOfferStatus>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblOffer = Selectable<OblOffersTable>;
export type NewOblOffer = Insertable<OblOffersTable>;
export type OblOfferUpdate = Updateable<OblOffersTable>;

export interface OblContractsTable {
  contract_id: string;
  offer_id: string;
  offer_version: number;
  provider: string;
  client: string;
  dispute_rule: OblDisputeRule;
  arbiter: string | null;
  metadata: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  service_order_schema: ColumnType<
    JsonValue | null,
    JsonValue | null | undefined,
    JsonValue | null
  >;
  pair_low: Generated<string>;
  pair_high: Generated<string>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblContract = Selectable<OblContractsTable>;
export type NewOblContract = Insertable<OblContractsTable>;
export type OblContractUpdate = Updateable<OblContractsTable>;

export interface OblInvoicesTable {
  invoice_id: string;
  contract_id: string | null;
  service_order_id: string | null;
  report_id: string | null;
  issuer: string;
  debtor: string;
  kind: OblInvoiceKind;
  details: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblInvoice = Selectable<OblInvoicesTable>;
export type NewOblInvoice = Insertable<OblInvoicesTable>;
export type OblInvoiceUpdate = Updateable<OblInvoicesTable>;

export interface OblObligationLinesTable {
  line_id: string;
  invoice_id: string;
  debtor: string;
  beneficiary: string;
  amount_usd: ColumnType<string, number | string, number | string>;
  final_amount_usd: ColumnType<string | null, number | string | null, number | string | null>;
  state: OblInvoiceState;
  dispute_group: string;
  role: string | null;
  pair_low: Generated<string>;
  pair_high: Generated<string>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblObligationLine = Selectable<OblObligationLinesTable>;
export type NewOblObligationLine = Insertable<OblObligationLinesTable>;
export type OblObligationLineUpdate = Updateable<OblObligationLinesTable>;

export interface OblLedgersTable {
  pair_low: string;
  pair_high: string;
  started_event_seq: bigint;
}

export type OblLedger = Selectable<OblLedgersTable>;
export type NewOblLedger = Insertable<OblLedgersTable>;

export interface OblPaymentsTable {
  payment_id: string;
  payer: string;
  receiver: string;
  amount_usd: ColumnType<string, number | string, number | string>;
  declared_amount_usd: ColumnType<string, number | string, number | string>;
  method: OblPaymentMethod;
  token_symbol: string | null;
  token_amount: string | null;
  rate_usd: ColumnType<string | null, number | string | null, number | string | null>;
  state: OblPaymentState;
  ref: ColumnType<JsonValue | null, JsonValue | null | undefined, JsonValue | null>;
  pair_low: Generated<string>;
  pair_high: Generated<string>;
  created_event_seq: bigint;
  transaction_id: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblPayment = Selectable<OblPaymentsTable>;
export type NewOblPayment = Insertable<OblPaymentsTable>;
export type OblPaymentUpdate = Updateable<OblPaymentsTable>;

export interface OblDisputesTable {
  dispute_id: string;
  invoice_id: string;
  disputant: string;
  proposed_amount_usd: ColumnType<string, number | string, number | string>;
  status: OblDisputeStatus;
  final_amount_usd: ColumnType<string | null, number | string | null, number | string | null>;
  resolver: string | null;
  created_event_seq: bigint;
  resolved_event_seq: bigint | null;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblDispute = Selectable<OblDisputesTable>;
export type NewOblDispute = Insertable<OblDisputesTable>;
export type OblDisputeUpdate = Updateable<OblDisputesTable>;

export interface OblServiceOrdersTable {
  service_order_id: string;
  contract_id: string;
  creator: string;
  provider: string;
  client: string;
  pair_low: Generated<string>;
  pair_high: Generated<string>;
  details: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblServiceOrder = Selectable<OblServiceOrdersTable>;
export type NewOblServiceOrder = Insertable<OblServiceOrdersTable>;
export type OblServiceOrderUpdate = Updateable<OblServiceOrdersTable>;

export interface OblReportsTable {
  report_id: string;
  contract_id: string | null;
  service_order_id: string | null;
  author: string;
  provider: string;
  client: string;
  pair_low: Generated<string>;
  pair_high: Generated<string>;
  details: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  created_event_seq: bigint;
  transaction_id: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type OblReport = Selectable<OblReportsTable>;
export type NewOblReport = Insertable<OblReportsTable>;
export type OblReportUpdate = Updateable<OblReportsTable>;

export interface OblOfferDraftsTable {
  author: string;
  draft_id: string;
  kind: OblOfferKind;
  fields: ColumnType<JsonValue, JsonValue | undefined, JsonValue>;
  legal_text: string | null;
  last_updated: number;
}

export type OblOfferDraft = Selectable<OblOfferDraftsTable>;
export type NewOblOfferDraft = Insertable<OblOfferDraftsTable>;
export type OblOfferDraftUpdate = Updateable<OblOfferDraftsTable>;

// ---------------------------------------------------------------------------
// OSL messaging
// ---------------------------------------------------------------------------

export interface ChannelsTable {
  channel_id: string;
  kind: string;
  creator: string;
  title: string | null;
  image: ColumnType<JsonValue | null, JsonValue | null | undefined, JsonValue | null>;
  object_id: string | null;
  pair_hash: string | null;
  access: string;
  last_message_at_unix: number | null;
  dissolved_at_unix: number | null;
  created_at_unix: number;
  event_seq: bigint;
  transaction_id: string;
}

export type Channel = Selectable<ChannelsTable>;
export type NewChannel = Insertable<ChannelsTable>;
export type ChannelUpdate = Updateable<ChannelsTable>;

export interface ChannelMembersTable {
  channel_id: string;
  account: string;
  role: string;
  joined_at_unix: number;
  last_read_at_unix: number | null;
}

export type ChannelMember = Selectable<ChannelMembersTable>;
export type NewChannelMember = Insertable<ChannelMembersTable>;

export interface ChannelAliasesTable {
  alias: string;
  channel_id: string;
  registered_by: string;
  created_at_unix: number;
  event_seq: bigint;
}

export type ChannelAlias = Selectable<ChannelAliasesTable>;
export type NewChannelAlias = Insertable<ChannelAliasesTable>;

export interface MessagesTable {
  message_id: string;
  channel_id: string;
  author: string;
  body: string | null;
  overflow_ref: string | null;
  encrypted_body: string | null;
  encryption_mode: string | null;
  encrypted_to: string | null;
  encryption_v: number | null;
  encryption_meta: ColumnType<JsonValue | null, JsonValue | null | undefined, JsonValue | null>;
  reply_to: string | null;
  quote_json: ColumnType<JsonValue | null, JsonValue | null | undefined, JsonValue | null>;
  attachments: ColumnType<JsonValue | null, JsonValue | null | undefined, JsonValue | null>;
  mentions: string[];
  /** Object ids mentioned in body (`/object/` + hashtags); object channels only. */
  linked_object_ids: string[];
  /** Original publish time for archival object activity (display only). */
  original_created_at_unix: number | null;
  /** Reserved for future message editing — unused until edit support lands. */
  updated_at_unix: number | null;
  created_at_unix: number;
  event_seq: bigint;
  transaction_id: string;
  search_vector: string | null;
}

export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;

export interface MessageTombstonesTable {
  message_id: string;
  channel_id: string;
  deleted_by: string;
  deleted_at_unix: number;
  event_seq: bigint;
  transaction_id: string;
}

export type MessageTombstone = Selectable<MessageTombstonesTable>;
export type NewMessageTombstone = Insertable<MessageTombstonesTable>;

export interface MessageContextExclusionsTable {
  message_id: string;
  excluded_by: string;
  excluded_at_unix: number;
  event_seq: bigint;
}

export type MessageContextExclusion = Selectable<MessageContextExclusionsTable>;
export type NewMessageContextExclusion = Insertable<MessageContextExclusionsTable>;
