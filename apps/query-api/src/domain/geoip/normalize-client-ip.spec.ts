import { normalizeClientIp } from './normalize-client-ip';

describe('normalizeClientIp', () => {
  it('accepts a dotted IPv4 address', () => {
    expect(normalizeClientIp('1.2.3.4')).toBe('1.2.3.4');
  });

  it('accepts a canonical IPv6 address', () => {
    expect(normalizeClientIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('strips IPv4-mapped prefix before validation', () => {
    expect(normalizeClientIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
  });

  it('rejects garbage and empty strings', () => {
    expect(normalizeClientIp('not-an-ip')).toBeNull();
    expect(normalizeClientIp('')).toBeNull();
    expect(normalizeClientIp('   ')).toBeNull();
  });

  it('rejects IPv4-mapped garbage after strip', () => {
    expect(normalizeClientIp('::ffff:not-ip')).toBeNull();
  });
});
