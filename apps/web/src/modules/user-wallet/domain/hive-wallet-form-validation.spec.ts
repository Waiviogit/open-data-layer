import {
  getMinHiveDelegationHp,
  isHiveDelegationHpAboveMinimum,
} from './hive-wallet-amount';
import {
  parseHiveRcAmount,
  validateHiveDelegationAmount,
  validateHiveDelegationUnchanged,
  validateHiveRcAmount,
  validateHiveWalletAmount,
} from './hive-wallet-form-validation';

describe('validateHiveDelegationAmount', () => {
  const chain = {
    totalVestingShares: '341884293795.055689 VESTS',
    totalVestingFundSteem: '210857021.344 HIVE',
  };

  it('rejects HP below the 1 HIVE chain minimum', () => {
    expect(validateHiveDelegationAmount('0.001', '100', chain)).toBe(
      'delegation_below_minimum',
    );
    expect(validateHiveDelegationAmount('1', '100', chain)).toBeNull();
  });

  it('rejects an HP total that matches the existing delegation', () => {
    expect(validateHiveDelegationUnchanged('50', '50')).toBe(
      'delegation_unchanged',
    );
    expect(validateHiveDelegationUnchanged('50.000', '50')).toBe(
      'delegation_unchanged',
    );
  });

  it('accepts a different HP total within the available max', () => {
    expect(validateHiveDelegationUnchanged('100', '50')).toBeNull();
    expect(validateHiveDelegationAmount('100', '208.334', chain)).toBeNull();
  });

  it('does not treat a first delegation as unchanged', () => {
    expect(validateHiveDelegationUnchanged('50', null)).toBeNull();
  });

  it('computes minimum close to 1 HP on mainnet globals', () => {
    const minHp = getMinHiveDelegationHp(
      chain.totalVestingShares,
      chain.totalVestingFundSteem,
    );
    expect(minHp).toBeGreaterThanOrEqual(1);
    expect(minHp).toBeLessThan(1.01);
    expect(
      isHiveDelegationHpAboveMinimum(
        0.999,
        chain.totalVestingShares,
        chain.totalVestingFundSteem,
      ),
    ).toBe(false);
    expect(
      isHiveDelegationHpAboveMinimum(
        1,
        chain.totalVestingShares,
        chain.totalVestingFundSteem,
      ),
    ).toBe(true);
  });
});

describe('validateHiveWalletAmount', () => {
  it('accepts amounts with up to 3 decimal places', () => {
    expect(validateHiveWalletAmount('0.001', '10')).toBeNull();
    expect(validateHiveWalletAmount('1.234', '10')).toBeNull();
  });

  it('rejects amounts with more than 3 decimal places', () => {
    expect(validateHiveWalletAmount('0.0001', '10')).toBe('amount_invalid');
  });
});

describe('parseHiveRcAmount', () => {
  it('accepts positive integers only', () => {
    expect(parseHiveRcAmount('1000000000')).toBe(1_000_000_000);
    expect(parseHiveRcAmount('1.5')).toBeNull();
    expect(parseHiveRcAmount('0')).toBeNull();
    expect(parseHiveRcAmount('')).toBeNull();
  });
});

describe('validateHiveRcAmount', () => {
  it('rejects decimals and enforces max', () => {
    expect(validateHiveRcAmount('100', '1000')).toBeNull();
    expect(validateHiveRcAmount('1.5', '1000')).toBe('amount_invalid');
    expect(validateHiveRcAmount('2000', '1000')).toBe('amount_exceeds_max');
  });
});
