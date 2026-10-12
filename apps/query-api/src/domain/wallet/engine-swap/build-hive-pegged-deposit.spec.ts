import { buildHivePeggedDepositMemo, buildHivePeggedDepositRouting } from './build-hive-pegged-deposit';

describe('buildHivePeggedDepositRouting', () => {
  it('returns honey-swap account and hivepegged buy memo for HIVE', () => {
    const result = buildHivePeggedDepositRouting('honey-swap', 'HIVE', 'alice');

    expect(result.account).toBe('honey-swap');
    expect(result.address).toBeNull();
    expect(result.exRate).toBe(1);
    expect(result.swapSymbol).toBe('SWAP.HIVE');
    expect(result.destination).toBe('alice');
    expect(result.pair).toContain('HIVE -> SWAP.HIVE');
    expect(result.memo).toBe(buildHivePeggedDepositMemo());
    expect(JSON.parse(result.memo!)).toEqual({
      id: 'ssc-mainnet-hive',
      json: {
        contractName: 'hivepegged',
        contractAction: 'buy',
        contractPayload: {},
      },
    });
  });
});
