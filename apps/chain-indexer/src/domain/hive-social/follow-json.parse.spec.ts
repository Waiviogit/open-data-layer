import {
  firstWhatToken,
  parseCustomJsonInner,
  parseFollowCustomJsonArray,
} from './follow-json.parse';

describe('parseCustomJsonInner', () => {
  it('parses JSON string to value', () => {
    expect(parseCustomJsonInner('["follow",{}]')).toEqual(['follow', {}]);
  });

  it('returns object as-is', () => {
    const v = ['follow', { x: 1 }];
    expect(parseCustomJsonInner(v)).toBe(v);
  });

  it('returns null for invalid JSON string', () => {
    expect(parseCustomJsonInner('{')).toBeNull();
  });
});

describe('parseFollowCustomJsonArray', () => {
  it('parses reblog branch', () => {
    expect(
      parseFollowCustomJsonArray([
        'reblog',
        { account: 'a', author: 'b', permlink: 'c' },
      ]),
    ).toEqual({
      kind: 'reblog',
      account: 'a',
      author: 'b',
      permlink: 'c',
    });
  });

  it('trims reblog fields', () => {
    expect(
      parseFollowCustomJsonArray([
        'reblog',
        { account: ' x ', author: ' y ', permlink: ' z ' },
      ]),
    ).toEqual({
      kind: 'reblog',
      account: 'x',
      author: 'y',
      permlink: 'z',
    });
  });

  it('parses follow branch with what', () => {
    expect(
      parseFollowCustomJsonArray([
        'follow',
        { follower: 'f1', following: 'f2', what: ['blog'] },
      ]),
    ).toEqual({
      kind: 'follow',
      follower: 'f1',
      following: 'f2',
      what: ['blog'],
    });
  });

  it('returns null for missing required fields', () => {
    expect(parseFollowCustomJsonArray(['follow', { follower: 'a' }])).toBeNull();
    expect(parseFollowCustomJsonArray(['reblog', { account: 'a' }])).toBeNull();
    expect(parseFollowCustomJsonArray(null)).toBeNull();
    expect(parseFollowCustomJsonArray([])).toBeNull();
  });
});

describe('firstWhatToken', () => {
  it('returns null for empty or missing what', () => {
    expect(firstWhatToken(undefined)).toBeNull();
    expect(firstWhatToken([])).toBeNull();
    expect(firstWhatToken([''])).toBeNull();
    expect(firstWhatToken(['  '])).toBeNull();
  });

  it('returns first non-empty token', () => {
    expect(firstWhatToken(['blog'])).toBe('blog');
    expect(firstWhatToken(['ignore'])).toBe('ignore');
  });
});
