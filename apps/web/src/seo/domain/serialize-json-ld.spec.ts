import { serializeJsonLd } from './serialize-json-ld';

describe('serializeJsonLd', () => {
  it('escapes less-than to prevent script breakout', () => {
    const serialized = serializeJsonLd({
      description: '</script><script>alert(1)</script>',
    });
    expect(serialized).toContain('\\u003c');
    expect(serialized).not.toMatch(/<\/script>/);
  });
});
