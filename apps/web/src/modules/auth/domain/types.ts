import type { HiveOperationPayload } from './hive-operations';

export type WalletProviderId = 'keychain' | 'hiveauth' | 'hivesigner';

export type WalletProviderCategory = 'extension' | 'mobile' | 'web';

export interface WalletProviderMeta {
  readonly id: WalletProviderId;
  readonly displayName: string;
  readonly category: WalletProviderCategory;
  readonly isCustodial: boolean;
}

/** Normalized Hive operations; signers map to provider wire format. */
export type BroadcastTransactionInput = HiveOperationPayload;

export interface BroadcastTransactionResult {
  readonly transactionId: string;
}

export interface WalletFacade {
  login(providerId: WalletProviderId, username: string): Promise<void>;
  broadcast(input: BroadcastTransactionInput): Promise<BroadcastTransactionResult>;
  /** Restore active provider after full page reload (e.g. from sessionStorage); no re-auth. */
  setActiveProvider(provider: WalletProviderId | null): void;
}
