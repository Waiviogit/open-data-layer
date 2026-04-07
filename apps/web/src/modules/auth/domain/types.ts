export type WalletProviderId = 'keychain' | 'hiveauth' | 'hivesigner';

export type WalletProviderCategory = 'extension' | 'mobile' | 'web';

export interface WalletProviderMeta {
  readonly id: WalletProviderId;
  readonly displayName: string;
  readonly category: WalletProviderCategory;
  readonly isCustodial: boolean;
}

/** Minimal broadcast payload; expand when wiring dhive operations. */
export interface BroadcastTransactionInput {
  readonly operations: readonly unknown[];
}

export interface BroadcastTransactionResult {
  readonly transactionId: string;
}

export interface WalletFacade {
  login(providerId: WalletProviderId, username: string): Promise<void>;
  broadcast(input: BroadcastTransactionInput): Promise<BroadcastTransactionResult>;
}
