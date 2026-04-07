import type {
  ColumnType,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AuthProvider = 'keychain' | 'hiveauth' | 'hivesigner';

export interface AuthChallengesTable {
  id: string;
  provider: AuthProvider;
  hive_username: string;
  nonce: string;
  message: string;
  expires_at: Date;
  used_at: Date | null;
  ip: string | null;
  user_agent: string | null;
  metadata_json: ColumnType<JsonValue | null, JsonValue | undefined | null, JsonValue | null>;
}

export interface AuthIdentitiesTable {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_subject: string;
  created_at: Date;
  last_used_at: Date;
  metadata_json: ColumnType<JsonValue | null, JsonValue | undefined | null, JsonValue | null>;
}

export interface RefreshSessionsTable {
  id: string;
  user_id: string;
  auth_provider: AuthProvider;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  device_info: string | null;
  ip: string | null;
  created_at: Date;
}

export interface AuthDatabase {
  auth_challenges: AuthChallengesTable;
  auth_identities: AuthIdentitiesTable;
  refresh_sessions: RefreshSessionsTable;
}

export type AuthChallenge = Selectable<AuthChallengesTable>;
export type NewAuthChallenge = Insertable<AuthChallengesTable>;
export type AuthIdentity = Selectable<AuthIdentitiesTable>;
export type NewAuthIdentity = Insertable<AuthIdentitiesTable>;
export type AuthIdentityUpdate = Updateable<AuthIdentitiesTable>;
export type RefreshSession = Selectable<RefreshSessionsTable>;
export type NewRefreshSession = Insertable<RefreshSessionsTable>;
export type RefreshSessionUpdate = Updateable<RefreshSessionsTable>;
