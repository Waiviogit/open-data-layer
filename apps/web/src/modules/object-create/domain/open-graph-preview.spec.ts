import {
  OG_PREVIEW_DESCRIPTION_MAX_CHARS,
  OG_PREVIEW_TITLE_MAX_CHARS,
  truncateOgDescription,
  truncateOgTitle,
} from './open-graph-preview';

describe('open-graph-preview', () => {
  it('truncates long titles at OG limit', () => {
    const long = 'a'.repeat(OG_PREVIEW_TITLE_MAX_CHARS + 10);
    const { text, truncated } = truncateOgTitle(long);
    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(OG_PREVIEW_TITLE_MAX_CHARS);
    expect(text.endsWith('…')).toBe(true);
  });

  it('keeps short titles intact', () => {
    expect(truncateOgTitle('Hello')).toEqual({
      text: 'Hello',
      truncated: false,
    });
  });

  it('truncates long descriptions at OG limit', () => {
    const long = 'b'.repeat(OG_PREVIEW_DESCRIPTION_MAX_CHARS + 5);
    const { truncated } = truncateOgDescription(long);
    expect(truncated).toBe(true);
  });
});
