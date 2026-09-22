import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { ObjectLeftRailBlock } from '@/modules/object/domain/object-page.types';

import { mergeLeftRailBlocksForEditMode } from './left-rail-edit-blocks';

describe('mergeLeftRailBlocksForEditMode', () => {
  const supported = [
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.MENU_ITEM,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.BUTTON,
    UPDATE_TYPES.WEBSITE,
  ];

  const productSupported = [
    ...supported,
    UPDATE_TYPES.OPTION,
    UPDATE_TYPES.PRICE,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  ];

  it('places button after menu and includes empty website slot', () => {
    const viewBlocks: ObjectLeftRailBlock[] = [
      {
        kind: 'description',
        headingLabel: 'Description',
        text: 'About us',
      },
    ];

    const merged = mergeLeftRailBlocksForEditMode(viewBlocks, supported);
    const kinds = merged.map((b) => b.kind);

    expect(kinds.indexOf('name')).toBeLessThan(kinds.indexOf('title'));
    expect(kinds.indexOf('title')).toBeLessThan(kinds.indexOf('menuItems'));
    expect(kinds.indexOf('menuItems')).toBeLessThan(kinds.indexOf('button'));
    expect(kinds.indexOf('button')).toBeLessThan(kinds.indexOf('description'));
    expect(kinds).toContain('websites');

    const button = merged.find((b) => b.kind === 'button');
    expect(button?.kind).toBe('button');
    if (button?.kind === 'button') {
      expect(button.items).toEqual([]);
    }

    const website = merged.find((b) => b.kind === 'websites');
    expect(website?.kind).toBe('websites');
    if (website?.kind === 'websites') {
      expect(website.entries).toEqual([]);
    }
  });

  it('reuses existing blocks when present', () => {
    const viewBlocks: ObjectLeftRailBlock[] = [
      { kind: 'name', headingLabel: 'Name', text: 'Shop' },
    ];
    const merged = mergeLeftRailBlocksForEditMode(viewBlocks, supported);
    expect(merged.find((b) => b.kind === 'name')).toEqual(viewBlocks[0]);
  });

  it('places an empty productGroupId slot immediately after identifier', () => {
    const merged = mergeLeftRailBlocksForEditMode(
      [],
      [UPDATE_TYPES.IDENTIFIER, UPDATE_TYPES.PRODUCT_GROUP_ID],
      'product',
    );
    const kinds = merged.map((b) => b.kind);
    const identifierIdx = kinds.indexOf('identifier');
    const groupIdx = kinds.indexOf('productGroupId');

    expect(identifierIdx).toBeGreaterThanOrEqual(0);
    expect(groupIdx).toBe(identifierIdx + 1);

    const group = merged[groupIdx];
    expect(group?.kind).toBe('productGroupId');
    if (group?.kind === 'productGroupId') {
      expect(group.text).toBe('');
      expect(group.headingLabel).toBe('Product Group ID');
    }
  });

  it('places gallery before commerce options for product type', () => {
    const merged = mergeLeftRailBlocksForEditMode([], productSupported, 'product');
    const kinds = merged.map((b) => b.kind);
    const optionsIdx = kinds.indexOf('options');
    const menuIdx = kinds.indexOf('menuItems');
    const galleryIdx = kinds.indexOf('gallery');

    expect(galleryIdx).toBeGreaterThanOrEqual(0);
    expect(menuIdx).toBeLessThan(galleryIdx);
    expect(optionsIdx).toBeGreaterThan(galleryIdx);
  });

  it('uses grouped recipe field order for recipe type', () => {
    const recipeSupported = [
      UPDATE_TYPES.NAME,
      UPDATE_TYPES.DESCRIPTION,
      UPDATE_TYPES.CALORIES,
      UPDATE_TYPES.BUDGET,
      UPDATE_TYPES.COOK_TIME,
      UPDATE_TYPES.NUTRITION,
      UPDATE_TYPES.INGREDIENTS,
      UPDATE_TYPES.CATEGORY,
      UPDATE_TYPES.AGGREGATE_RATING,
      UPDATE_TYPES.TAG_CATEGORY,
      UPDATE_TYPES.TAG_CATEGORY_ITEM,
    ];

    const merged = mergeLeftRailBlocksForEditMode([], recipeSupported, 'recipe');
    const kinds = merged.map((b) => b.kind);

    expect(kinds.indexOf('budget')).toBeLessThan(kinds.indexOf('cookTime'));
    expect(kinds.indexOf('description')).toBeLessThan(kinds.indexOf('nutrition'));
    expect(kinds.indexOf('rating')).toBeLessThan(kinds.indexOf('ingredients'));
    expect(kinds).toContain('budget');
  });
});
