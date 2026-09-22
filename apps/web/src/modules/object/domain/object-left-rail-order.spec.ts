import {
  resolveEditModeLeftRailBlockOrder,
  resolveAboutSectionBlockOrder,
  RECIPE_ABOUT_SECTION_BLOCK_ORDER,
  bookTypeAboutRemainderOrder,
} from './object-left-rail-order';

describe('resolveEditModeLeftRailBlockOrder', () => {
  it('places productGroupId immediately after identifier for product edit order', () => {
    const order = resolveEditModeLeftRailBlockOrder('product');
    const identifierIdx = order.indexOf('identifier');
    const groupIdx = order.indexOf('productGroupId');

    expect(identifierIdx).toBeGreaterThanOrEqual(0);
    expect(groupIdx).toBe(identifierIdx + 1);
  });

  it('places gallery before commerce options for product', () => {
    const order = resolveEditModeLeftRailBlockOrder('product');
    const galleryIdx = order.indexOf('gallery');
    const optionsIdx = order.indexOf('options');
    const menuIdx = order.indexOf('menuItems');

    expect(galleryIdx).toBeGreaterThanOrEqual(0);
    expect(menuIdx).toBeLessThan(galleryIdx);
    expect(optionsIdx).toBeGreaterThan(galleryIdx);
  });

  it('uses grouped restaurant edit order', () => {
    const order = resolveEditModeLeftRailBlockOrder('restaurant');
    expect(order.indexOf('name')).toBeLessThan(order.indexOf('image'));
    expect(order.indexOf('imageBackground')).toBeLessThan(order.indexOf('parent'));
    expect(order.indexOf('description')).toBeLessThan(order.indexOf('rating'));
    expect(order.indexOf('gallery')).toBeLessThan(order.indexOf('price'));
    expect(order.indexOf('price')).toBeLessThan(order.indexOf('workHours'));
    expect(order.indexOf('geo')).toBeLessThan(order.indexOf('websites'));
    expect(order.indexOf('walletAddress')).toBeLessThan(order.indexOf('identifier'));
  });

  it('places author in publication group for book edit order', () => {
    const order = resolveEditModeLeftRailBlockOrder('book');
    const authorIdx = order.indexOf('author');
    const titleIdx = order.indexOf('title');
    const parentIdx = order.indexOf('parent');

    expect(authorIdx).toBeGreaterThan(titleIdx);
    expect(authorIdx).toBeLessThan(parentIdx);
  });

  it('places book reading metadata after websites in book about remainder', () => {
    const order = bookTypeAboutRemainderOrder();
    const websitesIdx = order.indexOf('websites');
    const ageIdx = order.indexOf('typicalAgeRange');
    const languageIdx = order.indexOf('inLanguage');
    const dateIdx = order.indexOf('datePublished');
    const lengthIdx = order.indexOf('printLength');

    expect(order.indexOf('author')).toBe(-1);
    expect(websitesIdx).toBeGreaterThanOrEqual(0);
    expect(ageIdx).toBe(websitesIdx + 1);
    expect(languageIdx).toBe(ageIdx + 1);
    expect(dateIdx).toBe(languageIdx + 1);
    expect(lengthIdx).toBe(dateIdx + 1);
  });

  it('places catalog ops after gallery for list edit order', () => {
    const order = resolveEditModeLeftRailBlockOrder('list');
    expect(order.indexOf('gallery')).toBeLessThan(order.indexOf('sortCustom'));
    expect(order.indexOf('promotion')).toBeGreaterThan(order.indexOf('description'));
    expect(order.indexOf('pin')).toBeGreaterThan(order.indexOf('gallery'));
    expect(order.indexOf('remove')).toBeGreaterThan(order.indexOf('pin'));
    expect(order.indexOf('delegation')).toBeGreaterThan(order.indexOf('link'));
  });

  it('uses recipe-specific about order for recipe view blocks', () => {
    const order = resolveAboutSectionBlockOrder('recipe');
    expect(order).toEqual(RECIPE_ABOUT_SECTION_BLOCK_ORDER);
    expect(order.indexOf('cookTime')).toBeLessThan(order.indexOf('budget'));
    expect(order.indexOf('budget')).toBeLessThan(order.indexOf('calories'));
    expect(order.indexOf('nutrition')).toBeLessThan(order.indexOf('description'));
    expect(order.indexOf('description')).toBeLessThan(order.indexOf('tags'));
    expect(order.indexOf('tags')).toBeLessThan(order.indexOf('category'));
    expect(order.indexOf('category')).toBeLessThan(order.indexOf('rating'));
    expect(order.indexOf('rating')).toBeLessThan(order.indexOf('ingredients'));
  });

  it('uses grouped recipe edit order with commerce before recipe fields', () => {
    const order = resolveEditModeLeftRailBlockOrder('recipe');
    expect(order.indexOf('name')).toBeLessThan(order.indexOf('cookTime'));
    expect(order.indexOf('budget')).toBeLessThan(order.indexOf('cookTime'));
    expect(order.indexOf('description')).toBeLessThan(order.indexOf('nutrition'));
    expect(order.indexOf('ingredients')).toBeGreaterThan(order.indexOf('rating'));
    expect(order.includes('budget')).toBe(true);
  });

  it('keeps generic about order for restaurant view mode', () => {
    const order = resolveAboutSectionBlockOrder('restaurant');
    expect(order.indexOf('description')).toBeLessThan(order.indexOf('category'));
    expect(order.indexOf('category')).toBeLessThan(order.indexOf('rating'));
  });

  it('includes governance fields in edit order for governance type', () => {
    const order = resolveEditModeLeftRailBlockOrder('governance');
    expect(order).toContain('objectControl');
    expect(order).toContain('admins');
    expect(order).toContain('moderators');
    expect(order).toContain('trusted');
    expect(order).toContain('authorities');
    expect(order).toContain('whitelist');
    expect(order).toContain('restricted');
    expect(order).toContain('banned');
    expect(order).toContain('inheritsFrom');
    expect(order).toContain('validityCutoff');
    expect(order.indexOf('objectControl')).toBeLessThan(order.indexOf('admins'));
    expect(order.indexOf('admins')).toBeLessThan(order.indexOf('inheritsFrom'));
  });
});
