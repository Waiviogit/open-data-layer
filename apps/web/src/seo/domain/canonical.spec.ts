import {
  discoverCanonical,
  homeCanonical,
  objectCanonical,
  postCanonical,
  profileCanonical,
  signInCanonical,
} from './canonical';

describe('canonical URLs', () => {
  const origin = 'https://waiviodev.com';

  it('builds object canonical', () => {
    expect(objectCanonical(origin, 'obj-1')).toBe(
      'https://waiviodev.com/object/obj-1',
    );
  });

  it('encodes object id segments', () => {
    expect(objectCanonical(origin, 'a/b')).toBe(
      'https://waiviodev.com/object/a%2Fb',
    );
  });

  it('builds post canonical from permalink path', () => {
    expect(postCanonical(origin, '/@alice/my-post')).toBe(
      'https://waiviodev.com/@alice/my-post',
    );
  });

  it('builds profile canonical', () => {
    expect(profileCanonical(origin, 'alice')).toBe(
      'https://waiviodev.com/@alice',
    );
  });

  it('builds static route canonicals', () => {
    expect(homeCanonical(origin)).toBe('https://waiviodev.com/');
    expect(discoverCanonical(origin)).toBe('https://waiviodev.com/discover');
    expect(signInCanonical(origin)).toBe('https://waiviodev.com/sign-in');
  });
});
