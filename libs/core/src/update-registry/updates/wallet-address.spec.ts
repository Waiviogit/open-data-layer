import {
  UPDATE_WALLET_ADDRESS_SCHEMA,
  WALLET_SYMBOLS,
} from './wallet-address';

describe('UPDATE_WALLET_ADDRESS_SCHEMA', () => {
  it('accepts known wallet symbols with address', () => {
    for (const symbol of WALLET_SYMBOLS) {
      const result = UPDATE_WALLET_ADDRESS_SCHEMA.safeParse({
        symbol,
        address: 'bc1qexample',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown symbol', () => {
    expect(
      UPDATE_WALLET_ADDRESS_SCHEMA.safeParse({
        symbol: 'Dogecoin (DOGE)',
        address: 'addr',
      }).success,
    ).toBe(false);
  });

  it('rejects empty address', () => {
    expect(
      UPDATE_WALLET_ADDRESS_SCHEMA.safeParse({
        symbol: 'HIVE',
        address: '',
      }).success,
    ).toBe(false);
  });

  it('accepts optional title', () => {
    const result = UPDATE_WALLET_ADDRESS_SCHEMA.safeParse({
      symbol: 'Bitcoin (BTC)',
      address: 'bc1qexample',
      title: 'Donate here',
    });
    expect(result.success).toBe(true);
  });
});
