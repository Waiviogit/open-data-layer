import {
  OBJECT_CARD_DESCRIPTION_MAX_LENGTH,
  truncateObjectCardDescription,
} from './object-card-description';

describe('truncateObjectCardDescription', () => {
  it('returns trimmed text when within limit', () => {
    expect(truncateObjectCardDescription('  short  ')).toBe('short');
  });

  it('truncates to max length with ellipsis', () => {
    const long = 'a'.repeat(OBJECT_CARD_DESCRIPTION_MAX_LENGTH + 50);
    const result = truncateObjectCardDescription(long);
    expect(result).toHaveLength(OBJECT_CARD_DESCRIPTION_MAX_LENGTH + 1);
    expect(result.endsWith('…')).toBe(true);
  });
});
