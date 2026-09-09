import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Canonical wallet symbols (Waivio / legacy cryptocurrency picker). */
export const WALLET_SYMBOLS = [
  'Bitcoin (BTC)',
  'Litecoin (LTC)',
  'Ethereum (ETH)',
  'Lightning Bitcoin (LBTC)',
  'HIVE',
  'HBD',
  'WAIV',
] as const;

export type WalletSymbol = (typeof WALLET_SYMBOLS)[number];

const walletSymbolSchema = z.enum(WALLET_SYMBOLS);

export const UPDATE_WALLET_ADDRESS_SCHEMA = z.object({
  symbol: walletSymbolSchema,
  address: labelSchema,
  title: labelSchema.optional(),
});

export const UPDATE_WALLET_ADDRESS: UpdateDefinition = {
  update_type: UPDATE_TYPES.WALLET_ADDRESS,
  namespace: 'odl',
  localizable: true,
  description: 'Wallet or payment address.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: UPDATE_WALLET_ADDRESS_SCHEMA,
};
