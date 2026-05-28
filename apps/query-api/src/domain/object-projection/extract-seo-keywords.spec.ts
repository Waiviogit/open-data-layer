import { extractSeoKeywordsFromFields } from './extract-seo-keywords';

describe('extractSeoKeywordsFromFields', () => {
  it('returns unique tag values', () => {
    expect(
      extractSeoKeywordsFromFields({
        tagCategoryItem: [
          { category: 'Cuisine', value: 'Italian' },
          { category: 'Meal', value: 'pizza' },
          { category: 'Cuisine', value: 'Italian' },
        ],
      }),
    ).toEqual(['Italian', 'pizza']);
  });

  it('returns null when absent or empty', () => {
    expect(extractSeoKeywordsFromFields({})).toBeNull();
    expect(
      extractSeoKeywordsFromFields({
        tagCategoryItem: [{ category: 'x', value: '' }],
      }),
    ).toBeNull();
  });
});
