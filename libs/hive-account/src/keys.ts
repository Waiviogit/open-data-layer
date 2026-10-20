import { PrivateKey } from '@hiveio/dhive';

export const HIVE_ADDRESS_PREFIX = 'STM' as const;

export const HIVE_KEY_ROLES = ['owner', 'active', 'posting', 'memo'] as const;

export type HiveKeyRole = (typeof HIVE_KEY_ROLES)[number];

export type HiveKeyPair = {
  private: string;
  public: string;
};

export type HiveAccountKeys = Record<HiveKeyRole, HiveKeyPair>;

const MASTER_PASSWORD_ENTROPY_BYTES = 40;

function bytesToLatin1(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

function deriveRoleKey(
  username: string,
  password: string,
  role: HiveKeyRole,
): HiveKeyPair {
  const privateKey = PrivateKey.fromLogin(username, password, role);
  return {
    private: privateKey.toString(),
    public: privateKey.createPublic(HIVE_ADDRESS_PREFIX).toString(),
  };
}

export function suggestMasterPassword(): string {
  const entropy = new Uint8Array(MASTER_PASSWORD_ENTROPY_BYTES);
  crypto.getRandomValues(entropy);
  return `P${PrivateKey.fromSeed(bytesToLatin1(entropy)).toString()}`;
}

export function deriveAccountKeys(
  username: string,
  password: string,
): HiveAccountKeys {
  const name = username.toLowerCase();
  return {
    owner: deriveRoleKey(name, password, 'owner'),
    active: deriveRoleKey(name, password, 'active'),
    posting: deriveRoleKey(name, password, 'posting'),
    memo: deriveRoleKey(name, password, 'memo'),
  };
}
