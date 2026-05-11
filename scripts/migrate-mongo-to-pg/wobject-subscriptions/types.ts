/**
 * Loose shapes for MongoDB WobjectSubscriptions export.
 * @see tmp/WobjectSubscriptionSchema.js
 */

import type { MongoId } from '../objects/types';

export interface MongoWobjectSubscription {
  follower?: string;
  /** Wobject `object_id` (author_permlink), not a Hive account name. */
  following?: string;
  bell?: boolean;
  _id?: MongoId;
}
