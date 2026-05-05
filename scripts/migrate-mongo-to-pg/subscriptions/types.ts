/**
 * Loose shapes for MongoDB Subscriptions export.
 * @see tmp/SubscriptionSchema.js
 */

import type { MongoId } from '../objects/types';

export interface MongoSubscription {
  follower?: string;
  following?: string;
  bell?: boolean;
  _id?: MongoId;
}
