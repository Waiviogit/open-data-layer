import {
  parseAccountAuthorityCreate,
  parseAccountAuthorityRecover,
  parseAccountAuthorityUpdate,
} from './account-authority.parse';

describe('account-authority.parse', () => {
  it('extracts posting grantees and ignores key_auths', () => {
    const parsed = parseAccountAuthorityUpdate({
      account: 'flowmaster',
      posting: {
        weight_threshold: 1,
        account_auths: [
          ['waivio.import', 1],
          ['ecency.app', 1],
        ],
        key_auths: [['STM5CSuEihKVibpeJ9ruxhQyzfYiDX1FrMh4fuDR2M2hbwTGqX9oA', 1]],
      },
    });
    expect(parsed).toEqual({
      grantor: 'flowmaster',
      types: { posting: ['waivio.import', 'ecency.app'] },
    });
  });

  it('returns null when only memo_key is present', () => {
    expect(
      parseAccountAuthorityUpdate({
        account: 'flowmaster',
        memo_key: 'STM6HhfiYyrZhLwM7AGCJgR2PbnUxmmednYZ2Vt4AgDExVGFwveLB',
      }),
    ).toBeNull();
  });

  it('deduplicates grantee names', () => {
    const parsed = parseAccountAuthorityUpdate({
      account: 'flowmaster',
      posting: {
        account_auths: [
          ['waivio.import', 1],
          ['waivio.import', 1],
        ],
      },
    });
    expect(parsed?.types.posting).toEqual(['waivio.import']);
  });

  it('drops malformed account_auths entries', () => {
    const parsed = parseAccountAuthorityUpdate({
      account: 'flowmaster',
      posting: {
        account_auths: [
          ['waivio.import', 1],
          [123, 1],
          ['', 1],
        ] as unknown as [string, number][],
      },
    });
    expect(parsed?.types.posting).toEqual(['waivio.import']);
  });

  it('parses account_create authorities for new_account_name', () => {
    const parsed = parseAccountAuthorityCreate({
      new_account_name: 'newbie',
      owner: { account_auths: [['recovery', 1]] },
      posting: { account_auths: [['waivio.app', 1]] },
    });
    expect(parsed).toEqual({
      grantor: 'newbie',
      types: {
        owner: ['recovery'],
        posting: ['waivio.app'],
      },
    });
  });

  it('seeds empty account_auths from a paid account_create payload', () => {
    const parsed = parseAccountAuthorityCreate({
      fee: '3.000 HIVE',
      creator: 'flowmaster',
      new_account_name: 'insta.agent',
      memo_key: 'STM5XAS1mK4tnR6hB976AajBosUszqrp2e44UmJ57MNxADWpzZRAo',
      json_metadata: '{}',
      owner: {
        key_auths: [['STM5JCXwH8KDshDwc6iCfjrDkJvvVZ93dBmxsYW4VFZ5FNxr5EaHo', 1]],
        account_auths: [],
        weight_threshold: 1,
      },
      active: {
        key_auths: [['STM8Tq6oA8223cMmpZQwasw923X3dFU7mZaWdesNaQCyri1rL8Aug', 1]],
        account_auths: [],
        weight_threshold: 1,
      },
      posting: {
        key_auths: [['STM5J3ZZpMfHDYfuLAHTixPw5eYwycF96sGXgR1SkppXsPChxvrgA', 1]],
        account_auths: [],
        weight_threshold: 1,
      },
    });
    expect(parsed).toEqual({
      grantor: 'insta.agent',
      types: {
        owner: [],
        active: [],
        posting: [],
      },
    });
  });

  it('parses recover_account owner replacement only', () => {
    const parsed = parseAccountAuthorityRecover({
      account_to_recover: 'alice',
      new_owner_authority: { account_auths: [['new-rec', 1]] },
    });
    expect(parsed).toEqual({
      grantor: 'alice',
      types: { owner: ['new-rec'] },
    });
  });

  it('returns null without account name', () => {
    expect(parseAccountAuthorityUpdate({ posting: { account_auths: [] } })).toBeNull();
  });

  it('extracts grantees when key_auths weights are strings', () => {
    const parsed = parseAccountAuthorityUpdate({
      account: 'flowmaster',
      posting: {
        account_auths: [['waivio.import', 1]],
        key_auths: [['STM5CSuEihKVibpeJ9ruxhQyzfYiDX1FrMh4fuDR2M2hbwTGqX9oA', '1']],
      },
    });
    expect(parsed).toEqual({
      grantor: 'flowmaster',
      types: { posting: ['waivio.import'] },
    });
  });

  it('treats empty account_auths as revoke-all for that type', () => {
    const parsed = parseAccountAuthorityUpdate({
      account: 'flowmaster',
      posting: { account_auths: [] },
    });
    expect(parsed).toEqual({
      grantor: 'flowmaster',
      types: { posting: [] },
    });
  });
});
