/**
 * Loose shapes for MongoDB Subscriptions export.
 * @see tmp/SubscriptionSchema.js
 */

export interface MongoSubscription {
  follower?: string;
  following?: string;
  bell?: boolean;
}
