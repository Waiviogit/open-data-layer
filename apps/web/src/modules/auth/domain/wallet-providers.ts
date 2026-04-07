import type { WalletProviderMeta } from './types';

export const WALLET_PROVIDERS: WalletProviderMeta[] = [
  {
    id: 'keychain',
    displayName: 'Hive Keychain',
    category: 'extension',
    isCustodial: false,
  },
  {
    id: 'hiveauth',
    displayName: 'HiveAuth',
    category: 'mobile',
    isCustodial: false,
  },
  {
    id: 'hivesigner',
    displayName: 'HiveSigner',
    category: 'web',
    isCustodial: true,
  },
];
