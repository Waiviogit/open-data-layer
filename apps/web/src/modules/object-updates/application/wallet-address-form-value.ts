import { WALLET_SYMBOLS } from '@opden-data-layer/core/update-registry';

/** Default form state for a new `walletAddress` update. */
export function initialWalletAddressFormValue(): Record<string, unknown> {
  return {
    symbol: WALLET_SYMBOLS[0],
    address: '',
    title: '',
  };
}

/** Strip empty optional fields before Zod validation. */
export function sanitizeWalletAddressFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if (typeof out.title === 'string' && out.title.trim() === '') {
    delete out.title;
  }
  return out;
}
