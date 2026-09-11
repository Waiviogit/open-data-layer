import { HIVE_OPERATION } from './hive-parser';

describe('HIVE_OPERATION', () => {
  it('registers paid account creation under the on-chain op name', () => {
    expect(HIVE_OPERATION.CREATE_ACCOUNT).toBe('account_create');
  });
});
