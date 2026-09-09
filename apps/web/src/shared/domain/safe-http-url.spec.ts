import { isSafeHttpUrl, safeHttpUrl } from './safe-http-url';

describe('isSafeHttpUrl', () => {
  it('allows http and https', () => {
    expect(isSafeHttpUrl('https://example.com/path')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('rejects javascript and data schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects empty and invalid URLs', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('not-a-url')).toBe(false);
  });
});

describe('safeHttpUrl', () => {
  it('returns normalized URL for safe input', () => {
    expect(safeHttpUrl('https://example.com/foo')).toBe('https://example.com/foo');
  });

  it('returns null for unsafe input', () => {
    expect(safeHttpUrl('javascript:void(0)')).toBeNull();
  });
});
