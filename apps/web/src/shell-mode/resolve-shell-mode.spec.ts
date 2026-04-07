import { resolveShellMode } from './resolve-shell-mode';

describe('resolveShellMode', () => {
  it('uses cookie preference when set', () => {
    const r = resolveShellMode({ cookiePreference: 'twitter' });
    expect(r).toEqual({
      preference: 'twitter',
      resolvedMode: 'twitter',
      source: 'cookie',
    });
  });

  it('defaults when cookie is null', () => {
    const r = resolveShellMode({ cookiePreference: null });
    expect(r).toEqual({
      preference: 'default',
      resolvedMode: 'default',
      source: 'default',
    });
  });

  it('respects defaultPreference when no cookie', () => {
    const r = resolveShellMode({
      cookiePreference: null,
      defaultPreference: 'compact',
    });
    expect(r).toEqual({
      preference: 'compact',
      resolvedMode: 'compact',
      source: 'default',
    });
  });
});
