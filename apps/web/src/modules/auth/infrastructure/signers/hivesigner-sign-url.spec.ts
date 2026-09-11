import {
  buildHiveSignerSignUrl,
  encodeHiveSignerQueryValue,
} from './hivesigner-sign-url';

const POSTING_AUTHORITY = {
  weight_threshold: 1,
  account_auths: [['ora.agent', 1]] as const,
  key_auths: [
    ['STM8C5xsXTcUAkbpiHp6jif36pG4Y8p48ySSjRyo6mAajlHhB1tfMj', 1],
  ] as const,
};

const ACTIVE_AUTHORITY = {
  weight_threshold: 1,
  account_auths: [['bob', 1]] as const,
  key_auths: [['STM5CSuEihKVibpeJ9ruxhQyzfYiDX1FrMh4fuDR2M2hbwTGqX9oA', 1]] as const,
};

describe('encodeHiveSignerQueryValue', () => {
  it('leaves strings, finite numbers, and booleans as scalars', () => {
    expect(encodeHiveSignerQueryValue('alice')).toBe('alice');
    expect(encodeHiveSignerQueryValue(1)).toBe('1');
    expect(encodeHiveSignerQueryValue(true)).toBe('true');
  });

  it('JSON-encodes objects and arrays', () => {
    expect(encodeHiveSignerQueryValue(POSTING_AUTHORITY)).toBe(
      JSON.stringify(POSTING_AUTHORITY),
    );
    expect(encodeHiveSignerQueryValue(['flowmaster'])).toBe('["flowmaster"]');
    expect(encodeHiveSignerQueryValue([])).toBe('[]');
  });
});

describe('buildHiveSignerSignUrl', () => {
  it('JSON-encodes posting authority on account_update (not [object Object])', () => {
    const url = buildHiveSignerSignUrl(
      'account_update',
      {
        account: 'gobag',
        memo_key: 'STM8C5xsXTcUAkbpiHp6jif36pG4Y8p48ySSjRyo6mAajlHhB1tfMj',
        json_metadata: '{"beneficiaries":[]}',
        posting: POSTING_AUTHORITY,
      },
      'https://waiviodev.com/@gobag/permissions',
    );

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://hivesigner.com/sign/account_update',
    );
    const postingRaw = parsed.searchParams.get('posting');
    expect(postingRaw).not.toBe('[object Object]');
    expect(JSON.parse(postingRaw ?? '')).toEqual({
      weight_threshold: 1,
      account_auths: [['ora.agent', 1]],
      key_auths: [
        ['STM8C5xsXTcUAkbpiHp6jif36pG4Y8p48ySSjRyo6mAajlHhB1tfMj', 1],
      ],
    });
    expect(parsed.searchParams.get('account')).toBe('gobag');
    expect(parsed.searchParams.get('json_metadata')).toBe('{"beneficiaries":[]}');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://waiviodev.com/@gobag/permissions',
    );
  });

  it('JSON-encodes active authority on account_update', () => {
    const url = buildHiveSignerSignUrl(
      'account_update',
      {
        account: 'alice',
        memo_key: 'STM6HhfiYyrZhLwM7AGCJgR2PbnUxmmednYZ2Vt4AgDExVGFwveLB',
        json_metadata: '{}',
        active: ACTIVE_AUTHORITY,
      },
      'http://localhost:3000/@alice/permissions',
    );

    const parsed = new URL(url);
    expect(JSON.parse(parsed.searchParams.get('active') ?? '')).toEqual({
      weight_threshold: 1,
      account_auths: [['bob', 1]],
      key_auths: [['STM5CSuEihKVibpeJ9ruxhQyzfYiDX1FrMh4fuDR2M2hbwTGqX9oA', 1]],
    });
    expect(parsed.searchParams.get('posting')).toBeNull();
  });

  it('keeps scalar transfer fields as plain strings', () => {
    const url = buildHiveSignerSignUrl(
      'transfer',
      {
        from: 'alice',
        to: 'bob',
        amount: '1.000 HIVE',
        memo: 'thanks',
      },
      'http://localhost:3000/@alice/transfers',
    );

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://hivesigner.com/sign/transfer',
    );
    expect(parsed.searchParams.get('from')).toBe('alice');
    expect(parsed.searchParams.get('to')).toBe('bob');
    expect(parsed.searchParams.get('amount')).toBe('1.000 HIVE');
    expect(parsed.searchParams.get('memo')).toBe('thanks');
  });
});
