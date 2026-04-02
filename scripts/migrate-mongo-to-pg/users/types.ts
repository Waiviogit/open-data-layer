/**
 * Loose shapes for MongoDB User export (mongoexport / extended JSON).
 * @see tmp/UserSchema.js
 */

import type { MongoId } from '../objects/types';

export interface MongoDate {
  $date: string | number;
}

export interface MongoUserNotifications {
  activationCampaign?: boolean;
  deactivationCampaign?: boolean;
  follow?: boolean;
  fillOrder?: boolean;
  mention?: boolean;
  minimalTransfer?: number;
  reblog?: boolean;
  reply?: boolean;
  statusChange?: boolean;
  transfer?: boolean;
  powerUp?: boolean;
  witness_vote?: boolean;
  myPost?: boolean;
  myComment?: boolean;
  myLike?: boolean;
  /** Notification for generic "like" events; ODL column `user_notification_settings.vote`. */
  like?: boolean;
  downvote?: boolean;
  claimReward?: boolean;
}

export interface MongoUserSettings {
  exitPageSetting?: boolean;
  locale?: string;
  postLocales?: string[];
  nightmode?: boolean;
  rewardSetting?: string;
  rewriteLinks?: boolean;
  showNSFWPosts?: boolean;
  upvoteSetting?: boolean;
  votePercent?: number;
  votingPower?: boolean;
  userNotifications?: MongoUserNotifications;
  currency?: string;
}

export interface MongoUserMetadata {
  notifications_last_timestamp?: number;
  settings?: MongoUserSettings;
  bookmarks?: string[];
}

export interface MongoReferral {
  agent?: string;
  startedAt?: string | Date | MongoDate;
  endedAt?: string | Date | MongoDate;
  type?: string;
}

export interface MongoUser {
  name?: string;
  alias?: string;
  profile_image?: string;
  objects_follow?: string[];
  users_follow?: string[];
  json_metadata?: string;
  posting_json_metadata?: string;
  wobjects_weight?: number;
  count_posts?: number;
  last_posts_count?: number;
  user_metadata?: MongoUserMetadata;
  last_root_post?: string | null;
  users_following_count?: number;
  followers_count?: number;
  stage_version?: number;
  referralStatus?: string;
  referral?: MongoReferral[];
  lastActivity?: string | Date | MongoDate;
  _id?: MongoId;
  createdAt?: string | Date | MongoDate;
  updatedAt?: string | Date | MongoDate;
}
