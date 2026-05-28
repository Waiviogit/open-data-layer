import {
  listGalleryAlbumNamesFromFields,
  listTagCategoryNamesFromFields,
  seedFieldsForObjectType,
} from './supposed-update-seeds';

describe('seedFieldsForObjectType', () => {
  it('pre-fills tag categories and rating dimensions from recipe supposed_updates', () => {
    const fields = seedFieldsForObjectType('recipe', 'en-US');
    const tagCategories = fields.filter((f) => f.updateType === 'tagCategory');
    expect(tagCategories.map((f) => f.value)).toEqual(
      expect.arrayContaining(['Cuisine', 'Meal Type', 'Diet']),
    );
    const ratings = fields.filter((f) => f.updateType === 'aggregateRating');
    expect(ratings).toHaveLength(1);
    expect(ratings[0]?.value).toBe('Rating');
  });

  it('listGalleryAlbumNamesFromFields reads imageGallery values', () => {
    const fields = [
      {
        entryKey: 'imageGallery:1',
        updateType: 'imageGallery',
        value: 'photos',
        locale: 'en-US',
      },
    ];
    expect(listGalleryAlbumNamesFromFields(fields)).toEqual(['photos']);
  });

  it('listTagCategoryNamesFromFields reads seeded categories', () => {
    const fields = seedFieldsForObjectType('recipe', 'en-US');
    expect(listTagCategoryNamesFromFields(fields)).toEqual(
      expect.arrayContaining(['Cuisine', 'Meal Type', 'Diet']),
    );
  });

  it('seeds required ingredients row for recipe', () => {
    const fields = seedFieldsForObjectType('recipe', 'en-US');
    const ingredients = fields.filter((f) => f.updateType === 'ingredients');
    expect(ingredients).toHaveLength(1);
    expect(ingredients[0]?.value).toBe('');
  });

  it('does not seed tag category items — user adds tags per category', () => {
    const fields = seedFieldsForObjectType('recipe', 'en-US');
    expect(
      fields.filter((f) => f.updateType === 'tagCategoryItem'),
    ).toHaveLength(0);
  });
});
