import { projectedObjectWithCountsToPageModel } from './projected-object-to-page-model';
import type { ProjectedObjectWithCountsView } from './object-resolve.types';

describe('projectedObjectWithCountsToPageModel gallery', () => {
  it('maps root-level galleryAlbums and previewGallery from resolve payload', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: {
        name: 'Test',
        imageGallery: ['Photos'],
        imageGalleryItem: [
          { album: 'Photos', url: 'https://example.com/a.jpg', rank_score: 100 },
        ],
      },
      previewGallery: [
        { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
      ],
      galleryAlbums: [
        {
          name: 'Photos',
          items: [
            { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
          ],
        },
      ],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      favorited_by_count: 0,
      supervised_count: 0,
      exclusive_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);

    expect(model.galleryAlbums).toEqual([
      {
        name: 'Photos',
        items: [
          { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
        ],
      },
    ]);
    expect(model.previewGallery).toEqual([
      { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
    ]);
    expect(model.onChainGalleryAlbumNames).toEqual(['Photos']);
  });

  it('maps update_locales from resolve payload to updateLocales', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'recipe',
      semantic_type: 'schema:Recipe',
      weight: 1,
      fields: { name: 'Test' },
      followers_count: 0,
      experts_count: 0,
      posts_count: 0,
      updates_count: 2,
      favorited_by_count: 0,
      supervised_count: 0,
      exclusive_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: { name: 2 },
      update_locales: ['en-US', 'ko-KR'],
    };

    const model = projectedObjectWithCountsToPageModel(api);

    expect(model.updateLocales).toEqual(['en-US', 'ko-KR']);
  });

  it('omits left-rail gallery block when previewGallery is avatar-only', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: { name: 'Test' },
      previewGallery: [
        { url: 'https://example.com/avatar.jpg', rankScore: 100, isAvatar: true },
      ],
      galleryAlbums: [],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      favorited_by_count: 0,
      supervised_count: 0,
      exclusive_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);

    expect(model.leftRailBlocks.some((block) => block.kind === 'gallery')).toBe(false);
    expect(model.previewGallery).toHaveLength(1);
  });

  it('left-rail gallery block excludes avatar rows from carousel photos', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: { name: 'Test' },
      previewGallery: [
        { url: 'https://example.com/avatar.jpg', rankScore: 100, isAvatar: true },
        { url: 'https://example.com/a.jpg', rankScore: 90, isAvatar: false },
      ],
      galleryAlbums: [],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      favorited_by_count: 0,
      supervised_count: 0,
      exclusive_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const galleryBlock = model.leftRailBlocks.find((block) => block.kind === 'gallery');

    expect(galleryBlock).toMatchObject({
      kind: 'gallery',
      photos: [{ url: 'https://example.com/a.jpg', rankScore: 90, isAvatar: false }],
    });
  });
});

describe('projectedObjectWithCountsToPageModel product left-rail order', () => {
  const baseCounts = {
    followers_count: 0,
    posts_count: 0,
    updates_count: 0,
    favorited_by_count: 0,
    supervised_count: 0,
      exclusive_count: 0,
    is_following: false,
    viewer_bell: false,
    update_type_counts: {},
  };

  it('places gallery, price, and options before description for product types', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Shoe',
        description: 'A great shoe',
        price: '$99',
      },
      previewGallery: [
        { url: 'https://example.com/shoe.jpg', rankScore: 100, isAvatar: false },
      ],
      galleryAlbums: [],
      ...baseCounts,
    };

    const optionsApi = {
      object_id: 'prod-1',
      options: {
        Color: [
          {
            object_id: 'prod-1',
            category: 'Color',
            value: 'Red',
            position: 0,
            image: null,
            price: null,
            imageUrl: null,
          },
        ],
      },
    };

    const model = projectedObjectWithCountsToPageModel(api, optionsApi);
    const kinds = model.leftRailBlocks.map((block) => block.kind);

    const galleryIdx = kinds.indexOf('gallery');
    const priceIdx = kinds.indexOf('price');
    const optionsIdx = kinds.indexOf('options');
    const descriptionIdx = kinds.indexOf('description');

    expect(galleryIdx).toBeGreaterThanOrEqual(0);
    expect(priceIdx).toBeGreaterThan(galleryIdx);
    expect(optionsIdx).toBeGreaterThan(priceIdx);
    expect(descriptionIdx).toBeGreaterThan(optionsIdx);
  });

  it('keeps gallery after tags for non-product types', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'place-1',
      object_type: 'restaurant',
      semantic_type: 'schema:Restaurant',
      weight: 1,
      fields: {
        name: 'Cafe',
        price: '$10',
        tagCategory: ['Cuisine'],
        tagCategoryItem: [{ value: 'Italian', category: 'Cuisine' }],
      },
      previewGallery: [
        { url: 'https://example.com/cafe.jpg', rankScore: 100, isAvatar: false },
      ],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);

    const tagsIdx = kinds.indexOf('tags');
    const galleryIdx = kinds.indexOf('gallery');

    expect(tagsIdx).toBeGreaterThanOrEqual(0);
    expect(galleryIdx).toBeGreaterThan(tagsIdx);
  });

  it('places productWeight after websites on product pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        website: { title: 'Shop', link: 'https://example.com' },
        productWeight: { value: 12, unit: 'st' },
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const websitesIdx = kinds.indexOf('websites');
    const weightIdx = kinds.indexOf('productWeight');

    expect(websitesIdx).toBeGreaterThanOrEqual(0);
    expect(weightIdx).toBe(websitesIdx + 1);

    const weightBlock = model.leftRailBlocks[weightIdx];
    expect(weightBlock?.kind).toBe('productWeight');
    if (weightBlock?.kind === 'productWeight') {
      expect(weightBlock.value).toBe(12);
      expect(weightBlock.unit).toBe('st');
    }
  });

  it('places productGroupId immediately after identifier on product pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        identifier: [{ type: 'SKU', value: 'ABC' }],
        productGroupId: 'acme-phone-x',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const identifierIdx = kinds.indexOf('identifier');
    const groupIdx = kinds.indexOf('productGroupId');

    expect(identifierIdx).toBeGreaterThanOrEqual(0);
    expect(groupIdx).toBe(identifierIdx + 1);

    const groupBlock = model.leftRailBlocks[groupIdx];
    expect(groupBlock?.kind).toBe('productGroupId');
    if (groupBlock?.kind === 'productGroupId') {
      expect(groupBlock.text).toBe('acme-phone-x');
      expect(groupBlock.headingLabel).toBe('Product Group ID');
    }
  });

  it('places size after productWeight on product pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        productWeight: { value: 12, unit: 'st' },
        size: { length: 11, width: 20, depth: 3, unit: 'μm' },
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const weightIdx = kinds.indexOf('productWeight');
    const sizeIdx = kinds.indexOf('size');

    expect(weightIdx).toBeGreaterThanOrEqual(0);
    expect(sizeIdx).toBe(weightIdx + 1);

    const sizeBlock = model.leftRailBlocks[sizeIdx];
    expect(sizeBlock?.kind).toBe('size');
    if (sizeBlock?.kind === 'size') {
      expect(sizeBlock.length).toBe(11);
      expect(sizeBlock.width).toBe(20);
      expect(sizeBlock.depth).toBe(3);
      expect(sizeBlock.unit).toBe('μm');
    }
  });

  it('places merchant, brand, and manufacturer after size on product pages', () => {
    const ref = (id: string, name: string) => ({
      object_id: id,
      object_type: 'business',
      fields: { name, image: `https://cdn.example/${id}.jpg` },
      weight: 1,
    });

    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        size: { length: 11, width: 20, depth: 3, unit: 'μm' },
        merchant: ref('merchant-1', 'Acme Store'),
        brand: ref('brand-1', 'Acme Brand'),
        manufacturer: ref('mfg-1', 'Acme Mfg'),
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const sizeIdx = kinds.indexOf('size');
    const merchantIdx = kinds.indexOf('merchant');
    const brandIdx = kinds.indexOf('brand');
    const manufacturerIdx = kinds.indexOf('manufacturer');

    expect(sizeIdx).toBeGreaterThanOrEqual(0);
    expect(merchantIdx).toBe(sizeIdx + 1);
    expect(brandIdx).toBe(merchantIdx + 1);
    expect(manufacturerIdx).toBe(brandIdx + 1);

    const merchantBlock = model.leftRailBlocks[merchantIdx];
    expect(merchantBlock?.kind).toBe('merchant');
    if (merchantBlock?.kind === 'merchant') {
      expect(merchantBlock.items[0]?.objectId).toBe('merchant-1');
      expect(merchantBlock.items[0]?.name).toBe('Acme Store');
    }
  });

  it('places featureList after manufacturer on product pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        manufacturer: {
          object_id: 'mfg-1',
          object_type: 'business',
          fields: { name: 'Acme Mfg' },
          weight: 1,
        },
        featureList: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
        ],
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const manufacturerIdx = kinds.indexOf('manufacturer');
    const featureIdx = kinds.indexOf('featureList');

    expect(manufacturerIdx).toBeGreaterThanOrEqual(0);
    expect(featureIdx).toBe(manufacturerIdx + 1);

    const featureBlock = model.leftRailBlocks[featureIdx];
    expect(featureBlock?.kind).toBe('featureList');
    if (featureBlock?.kind === 'featureList') {
      expect(featureBlock.items).toEqual([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);
    }
  });

  it('hoists author before parent and menu without duplicating book blocks', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'book-1',
      object_type: 'book',
      semantic_type: 'schema:Book',
      weight: 1,
      fields: {
        name: 'Novel',
        description: 'A story',
        website: { title: 'Publisher', link: 'https://example.com' },
        author: [
          {
            object_id: 'ylk-test-person-1',
            fields: { name: 'Author One', image: 'https://example.com/a.jpg' },
          },
          {
            object_id: 'ylk-test-person-2',
            fields: { name: 'Author Two' },
          },
        ],
        typicalAgeRange: '18',
        inLanguage: 'English',
        datePublished: '2020-01-15',
        printLength: '320',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const descriptionIdx = kinds.indexOf('description');
    const authorIdx = kinds.indexOf('author');
    const parentIdx = kinds.indexOf('parent');
    const websitesIdx = kinds.indexOf('websites');
    const ageIdx = kinds.indexOf('typicalAgeRange');

    expect(kinds.filter((kind) => kind === 'author')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'typicalAgeRange')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'inLanguage')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'datePublished')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'printLength')).toHaveLength(1);

    expect(authorIdx).toBeGreaterThanOrEqual(0);
    if (parentIdx >= 0) {
      expect(authorIdx).toBeLessThan(parentIdx);
    }

    const menuIdx = kinds.indexOf('menuItems');
    if (menuIdx >= 0) {
      expect(authorIdx).toBeLessThan(menuIdx);
      expect(ageIdx).toBeGreaterThan(menuIdx);
    }

    expect(websitesIdx).toBeGreaterThanOrEqual(0);
    expect(ageIdx).toBe(websitesIdx + 1);
    expect(descriptionIdx).toBeLessThan(websitesIdx);

    const authorBlock = model.leftRailBlocks[authorIdx];
    expect(authorBlock?.kind).toBe('author');
    if (authorBlock?.kind === 'author') {
      expect(authorBlock.items).toHaveLength(2);
      expect(authorBlock.items[0]?.name).toBe('Author One');
      expect(authorBlock.items[1]?.name).toBe('Author Two');
    }
  });

  it('places typicalAgeRange after websites on book pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'book-1',
      object_type: 'book',
      semantic_type: 'schema:Book',
      weight: 1,
      fields: {
        name: 'Novel',
        description: 'A story',
        website: { title: 'Publisher', link: 'https://example.com' },
        typicalAgeRange: '18',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const websitesIdx = kinds.indexOf('websites');
    const descriptionIdx = kinds.indexOf('description');
    const ageIdx = kinds.indexOf('typicalAgeRange');

    expect(websitesIdx).toBeGreaterThanOrEqual(0);
    expect(ageIdx).toBe(websitesIdx + 1);
    expect(descriptionIdx).toBeLessThan(websitesIdx);

    const ageBlock = model.leftRailBlocks[ageIdx];
    expect(ageBlock?.kind).toBe('typicalAgeRange');
    if (ageBlock?.kind === 'typicalAgeRange') {
      expect(ageBlock.text).toBe('18');
    }
  });

  it('places inLanguage after typicalAgeRange on book pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'book-1',
      object_type: 'book',
      semantic_type: 'schema:Book',
      weight: 1,
      fields: {
        name: 'Novel',
        typicalAgeRange: '18',
        inLanguage: 'English',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const ageIdx = kinds.indexOf('typicalAgeRange');
    const languageIdx = kinds.indexOf('inLanguage');

    expect(ageIdx).toBeGreaterThanOrEqual(0);
    expect(languageIdx).toBe(ageIdx + 1);

    const languageBlock = model.leftRailBlocks[languageIdx];
    expect(languageBlock?.kind).toBe('inLanguage');
    if (languageBlock?.kind === 'inLanguage') {
      expect(languageBlock.text).toBe('English');
    }
  });

  it('places datePublished after inLanguage on book pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'book-1',
      object_type: 'book',
      semantic_type: 'schema:Book',
      weight: 1,
      fields: {
        name: 'Novel',
        inLanguage: 'English',
        datePublished: '2020-01-15T00:00:00.000Z',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const languageIdx = kinds.indexOf('inLanguage');
    const dateIdx = kinds.indexOf('datePublished');

    expect(languageIdx).toBeGreaterThanOrEqual(0);
    expect(dateIdx).toBe(languageIdx + 1);

    const dateBlock = model.leftRailBlocks[dateIdx];
    expect(dateBlock?.kind).toBe('datePublished');
    if (dateBlock?.kind === 'datePublished') {
      expect(dateBlock.text).toBe('2020-01-15T00:00:00.000Z');
    }
  });

  it('places printLength after datePublished on book pages', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'book-1',
      object_type: 'book',
      semantic_type: 'schema:Book',
      weight: 1,
      fields: {
        name: 'Novel',
        datePublished: '2020-01-15',
        printLength: '320',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    const dateIdx = kinds.indexOf('datePublished');
    const lengthIdx = kinds.indexOf('printLength');

    expect(dateIdx).toBeGreaterThanOrEqual(0);
    expect(lengthIdx).toBe(dateIdx + 1);

    const lengthBlock = model.leftRailBlocks[lengthIdx];
    expect(lengthBlock?.kind).toBe('printLength');
    if (lengthBlock?.kind === 'printLength') {
      expect(lengthBlock.text).toBe('320');
    }
  });

  it('omits printLength on product pages even when field is set', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        printLength: '320',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    expect(kinds).not.toContain('printLength');
  });

  it('omits datePublished on product pages even when field is set', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        datePublished: '2020-01-15',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    expect(kinds).not.toContain('datePublished');
  });

  it('omits inLanguage on product pages even when field is set', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        inLanguage: 'English',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    expect(kinds).not.toContain('inLanguage');
  });

  it('omits typicalAgeRange on product pages even when field is set', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: {
        name: 'Widget',
        typicalAgeRange: '18',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);
    expect(kinds).not.toContain('typicalAgeRange');
  });

  it('prepends Widget tab for widget object type', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'podcast-1',
      object_type: 'widget',
      semantic_type: null,
      weight: 1,
      fields: {
        name: 'Podcast',
        widget: { column: 'one', type: 'Widget', content: '<p>embed</p>' },
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.primaryTabs[0]).toEqual({ segment: 'widget', label: 'Widget' });
    expect(model.primaryTabs[1]?.segment).toBe('reviews');
    expect(model.widgetConfig).toEqual({
      column: 'one',
      type: 'Widget',
      content: '<p>embed</p>',
    });
  });

  it('does not prepend Widget tab for non-widget types', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      weight: 1,
      fields: { name: 'Product' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.primaryTabs[0]).toEqual({ segment: 'details', label: 'Details' });
    expect(model.primaryTabs[1]?.segment).toBe('reviews');
    expect(model.primaryTabs.some((tab) => tab.segment === 'widget')).toBe(false);
    expect(model.widgetConfig).toBeNull();
  });

  it('prepends Details tab for restaurant object type', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'rest-1',
      object_type: 'restaurant',
      semantic_type: null,
      weight: 1,
      fields: { name: 'Catch Kitchen + Bar' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.primaryTabs[0]).toEqual({ segment: 'details', label: 'Details' });
    expect(model.primaryTabs[1]?.segment).toBe('reviews');
  });

  it('does not prepend Details tab for page host type', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'page-1',
      object_type: 'page',
      semantic_type: null,
      weight: 1,
      fields: { name: 'About Us', pageContent: '<p>Hello</p>' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.primaryTabs[0]?.segment).toBe('reviews');
    expect(model.primaryTabs.some((tab) => tab.segment === 'details')).toBe(false);
  });

  it('prepends List tab for list object type', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'list-1',
      object_type: 'list',
      semantic_type: null,
      weight: 1,
      fields: { name: 'My List' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.primaryTabs[0]).toEqual({ segment: 'list', label: 'List' });
    expect(model.primaryTabs[1]?.segment).toBe('reviews');
  });
});

describe('projectedObjectWithCountsToPageModel closed venue status block', () => {
  const baseCounts = {
    followers_count: 0,
    posts_count: 0,
    updates_count: 0,
    favorited_by_count: 0,
    supervised_count: 0,
    exclusive_count: 0,
    is_following: false,
    viewer_bell: false,
    update_type_counts: {},
  };

  it('emits status block for closed restaurant', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'rest-1',
      object_type: 'restaurant',
      semantic_type: null,
      status: 'closed',
      weight: 1,
      fields: { name: 'Good Co.' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.leftRailBlocks[0]).toEqual({
      kind: 'status',
      headingLabel: 'Status',
      status: 'closed',
    });
    expect(model.lifecycleStatus).toBe('closed');
  });

  it('omits status block for active restaurant', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'rest-1',
      object_type: 'restaurant',
      semantic_type: null,
      status: 'active',
      weight: 1,
      fields: { name: 'Good Co.' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.leftRailBlocks.some((b) => b.kind === 'status')).toBe(false);
  });

  it('omits status block for closed product', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'prod-1',
      object_type: 'product',
      semantic_type: 'schema:Product',
      status: 'closed',
      weight: 1,
      fields: { name: 'Widget' },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.leftRailBlocks.some((b) => b.kind === 'status')).toBe(false);
  });

  it('maps recipe fields in legacy order with populated payloads', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'recipe-1',
      object_type: 'recipe',
      semantic_type: 'schema:Recipe',
      weight: 1,
      fields: {
        name: 'Kimchi',
        cookTime: '20–40 minutes',
        budget: '$',
        calories: 'Approx. 50 per serving',
        nutrition: '2g protein, 0g fat, 9g carbohydrates',
        description: 'Fresh kimchi side dish.',
        tagCategory: ['Cuisine', 'Pros'],
        tagCategoryItem: [
          { category: 'Cuisine', value: 'Korean' },
          { category: 'Cuisine', value: 'Asian' },
          { category: 'Pros', value: 'No-cook' },
        ],
        category: ['Korean Cuisine', 'Side Dishes'],
        aggregateRating: [
          {
            update_id: 'rating-1',
            dimension: 'Rating',
            averageRating: 0,
            totalVoters: 0,
          },
        ],
        ingredients: ['Napa Cabbage — 8 lbs 8 oz', 'Sea Salt', 'Water'],
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);

    expect(kinds.indexOf('cookTime')).toBeLessThan(kinds.indexOf('budget'));
    expect(kinds.indexOf('budget')).toBeLessThan(kinds.indexOf('calories'));
    expect(kinds.indexOf('nutrition')).toBeLessThan(kinds.indexOf('description'));
    expect(kinds.indexOf('description')).toBeLessThan(kinds.indexOf('tags'));
    expect(kinds.indexOf('tags')).toBeLessThan(kinds.indexOf('category'));
    expect(kinds.indexOf('category')).toBeLessThan(kinds.indexOf('rating'));
    expect(kinds.indexOf('rating')).toBeLessThan(kinds.indexOf('ingredients'));

    const cookTime = model.leftRailBlocks.find((b) => b.kind === 'cookTime');
    expect(cookTime?.kind).toBe('cookTime');
    if (cookTime?.kind === 'cookTime') {
      expect(cookTime.text).toBe('20–40 minutes');
    }

    const ingredients = model.leftRailBlocks.find((b) => b.kind === 'ingredients');
    expect(ingredients?.kind).toBe('ingredients');
    if (ingredients?.kind === 'ingredients') {
      expect(ingredients.items).toHaveLength(3);
    }

    const tags = model.leftRailBlocks.find((b) => b.kind === 'tags');
    expect(tags?.kind).toBe('tags');
    if (tags?.kind === 'tags') {
      expect(tags.sections[0]?.categoryTitle).toBe('Cuisine');
      expect(tags.sections[1]?.categoryTitle).toBe('Pros');
    }
  });

  it('omits empty recipe nutrition block in view mode', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'recipe-2',
      object_type: 'recipe',
      semantic_type: 'schema:Recipe',
      weight: 1,
      fields: {
        name: 'Simple',
        cookTime: '10 minutes',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    expect(model.leftRailBlocks.some((b) => b.kind === 'nutrition')).toBe(false);
    expect(model.leftRailBlocks.some((b) => b.kind === 'cookTime')).toBe(true);
  });

  it('maps governance user_ref fields to left-rail blocks', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'gov-1',
      object_type: 'governance',
      semantic_type: null,
      weight: 1,
      fields: {
        name: 'Site governance',
        admins: ['alice', 'bob'],
        moderators: ['mod1'],
        objectControl: 'full',
      },
      previewGallery: [],
      galleryAlbums: [],
      ...baseCounts,
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const kinds = model.leftRailBlocks.map((block) => block.kind);

    expect(kinds).toContain('objectControl');
    expect(kinds).toContain('admins');
    expect(kinds).toContain('moderators');

    const adminsBlock = model.leftRailBlocks.find((b) => b.kind === 'admins');
    expect(adminsBlock && adminsBlock.kind === 'admins' ? adminsBlock.accounts : []).toEqual([
      'alice',
      'bob',
    ]);

    const controlBlock = model.leftRailBlocks.find((b) => b.kind === 'objectControl');
    expect(
      controlBlock && controlBlock.kind === 'objectControl' ? controlBlock.text : null,
    ).toBe('full');
  });
});
