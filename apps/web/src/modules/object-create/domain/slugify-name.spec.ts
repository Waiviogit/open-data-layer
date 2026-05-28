import { slugifyName } from './slugify-name';

describe('slugifyName', () => {
  it('slugifies ASCII with spaces', () => {
    expect(slugifyName('My Object')).toBe('my-object');
  });

  it('transliterates Cyrillic', () => {
    expect(slugifyName('мой объект')).toBe('moy-obekt');
  });

  it('strips diacritics from Latin', () => {
    expect(slugifyName('Café résumé')).toBe('cafe-resume');
  });

  it('returns empty for whitespace-only', () => {
    expect(slugifyName('   ')).toBe('');
  });
});
