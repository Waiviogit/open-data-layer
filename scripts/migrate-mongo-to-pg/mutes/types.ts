/**
 * Legacy Mongo `MutedUserSchema`: `{ userName, mutedBy }`.
 * Maps to PostgreSQL `user_account_mutes`: `muted` ← userName, `muter` ← mutedBy.
 */
export interface MongoMute {
  /** Account that was muted (maps to PG `muted`). */
  userName?: string;
  /** Account that applied the mute (maps to PG `muter`). */
  mutedBy?: string;
  /** Fallback aliases if export used different keys. */
  muter?: string;
  muted?: string;
  follower?: string;
  following?: string;
}
