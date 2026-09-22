import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import {
  applySortCustomToMenuItems,
  applySortCustomToListItems,
  projectedListItems,
  projectedMenuItemsFromListItems,
  resolveMenuItemsForView,
  sortListItemsListsFirst,
  projectedGeoLatLon,
  projectedIdentifierRows,
  projectedProductGroupId,
  projectedMenuItems,
  projectedSortCustom,
  projectedTagCategorySections,
  mergeTagCategorySectionsForEditMode,
  projectedTelephoneEntries,
  projectedWalletAddressRows,
  projectedObjectLinkRows,
  projectedButtonItems,
  projectedParentRow,
  projectedLegalText,
  projectedHostHtmlBody,
  projectedPageContent,
  projectedWidgetConfig,
  projectedPreviewGallery,
  projectedGalleryAlbums,
  linkKindPublicIconSrc,
  linkKindDisplayLabel,
  walletSymbolDisplayName,
  walletSymbolIconSrc,
} from './object-projected-fields';

function viewWithMenu(
  menuItem: unknown,
  sortCustom: unknown,
): ProjectedObjectView {
  return {
    object_id: 'x',
    object_type: 'business',
    semantic_type: null,
    weight: null,
    fields: { menuItem, sortCustom },
    isFavorited: false,
    hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
  };
}

describe('object-projected-fields', () => {
  it('orders menu items by sortCustom.include then appends the rest', () => {
    const menu = [
      { title: 'A', style: 'default', link_to_web: 'https://a.example' },
      { title: 'B', style: 'default', link_to_web: 'https://b.example' },
      { title: 'C', style: 'highlight', link_to_object: 'ref-c', object_type: 'list' },
    ];
    const sort = { include: ['B', 'ref-c'], exclude: [] };
    const v = viewWithMenu(menu, sort);
    const items = applySortCustomToMenuItems(projectedMenuItems(v), projectedSortCustom(v));
    expect(items.map((i) => i.displayTitle)).toEqual(['B', 'C', 'A']);
  });

  it('excludes menu rows matched by sortCustom.exclude', () => {
    const menu = [
      { title: 'A', style: 'default', link_to_web: 'https://a.example' },
      { title: 'B', style: 'default', link_to_web: 'https://b.example' },
    ];
    const sort = { include: [], exclude: ['https://b.example'] };
    const v = viewWithMenu(menu, sort);
    const items = applySortCustomToMenuItems(projectedMenuItems(v), projectedSortCustom(v));
    expect(items.map((i) => i.displayTitle)).toEqual(['A']);
  });

  it('sorts list-type items before other object types', () => {
    const items = sortListItemsListsFirst([
      { objectId: 'p1', objectType: 'page', name: 'Page', imageUrl: null, weight: null },
      { objectId: 'l1', objectType: 'list', name: 'List A', imageUrl: null, weight: null },
      { objectId: 'b1', objectType: 'business', name: 'Biz', imageUrl: null, weight: null },
      { objectId: 'l2', objectType: 'list', name: 'List B', imageUrl: null, weight: null },
    ]);
    expect(items.map((i) => i.objectId)).toEqual(['l1', 'l2', 'p1', 'b1']);
  });

  it('applySortCustomToListItems uses rank (weight desc) when sortCustom is absent', () => {
    const items = [
      {
        objectId: 'dips',
        objectType: 'list',
        name: 'Dips and Salsas',
        imageUrl: null,
        weight: 0.00001534,
      },
      {
        objectId: 'finger',
        objectType: 'list',
        name: 'Finger Foods',
        imageUrl: null,
        weight: 0.00003854,
      },
      {
        objectId: 'street',
        objectType: 'list',
        name: 'Street Food Favorites',
        imageUrl: null,
        weight: 0.000037,
      },
    ];
    const sorted = applySortCustomToListItems(items, null);
    expect(sorted.map((i) => i.objectId)).toEqual(['finger', 'street', 'dips']);
  });

  it('applySortCustomToListItems sorts by addedAtUnix for recency modes', () => {
    const items = [
      {
        objectId: 'old',
        objectType: 'page',
        name: 'Old',
        imageUrl: null,
        weight: null,
        addedAtUnix: 100,
      },
      {
        objectId: 'new',
        objectType: 'page',
        name: 'New',
        imageUrl: null,
        weight: null,
        addedAtUnix: 300,
      },
      {
        objectId: 'mid',
        objectType: 'page',
        name: 'Mid',
        imageUrl: null,
        weight: null,
        addedAtUnix: 200,
      },
    ];
    expect(
      applySortCustomToListItems(items, {
        include: [],
        exclude: [],
        sortType: 'reverse_recency',
      }).map((i) => i.objectId),
    ).toEqual(['new', 'mid', 'old']);
    expect(
      applySortCustomToListItems(items, {
        include: [],
        exclude: [],
        sortType: 'recency',
      }).map((i) => i.objectId),
    ).toEqual(['old', 'mid', 'new']);
  });

  it('applySortCustomToListItems moves lists first after include ordering', () => {
    const items = [
      { objectId: 'p1', objectType: 'page', name: 'Page', imageUrl: null, weight: null },
      { objectId: 'l1', objectType: 'list', name: 'List', imageUrl: null, weight: null },
    ];
    const sorted = applySortCustomToListItems(items, { include: ['p1', 'l1'], exclude: [] });
    expect(sorted.map((i) => i.objectId)).toEqual(['l1', 'p1']);
  });

  it('applySortCustomToListItems dedupes duplicate objectIds before custom include ordering', () => {
    const dinner = {
      objectId: 'dqu-dinner',
      objectType: 'list',
      name: 'Dinner',
      imageUrl: null,
      weight: 10,
      listItemsCount: 44,
    } as const;
    const items = [
      dinner,
      { objectId: 'dqu-desserts', objectType: 'list', name: 'Desserts', imageUrl: null, weight: 9, listItemsCount: 8 },
      { ...dinner },
      { objectId: 'dqu-kids', objectType: 'list', name: 'Kids', imageUrl: null, weight: 8, listItemsCount: 9 },
    ];
    const sorted = applySortCustomToListItems(items, {
      include: ['dqu-desserts', 'dqu-dinner', 'dqu-kids', 'dqu-dinner'],
      exclude: [],
    });
    expect(sorted.map((i) => i.objectId)).toEqual(['dqu-desserts', 'dqu-dinner', 'dqu-kids']);
  });

  it('projectedListItems deduplicates rows with the same objectId', () => {
    const v: ProjectedObjectView = {
      object_id: 'parent-list',
      object_type: 'list',
      semantic_type: null,
      weight: null,
      fields: {
        listItem: [
          {
            object_id: 'bev-test-list-not-bad-advice-2',
            object_type: 'list',
            fields: { name: 'test list not bad advice 2' },
          },
          {
            object_id: 'bev-test-list-not-bad-advice-2',
            object_type: 'list',
            fields: { name: 'test list not bad advice 2 duplicate' },
          },
          {
            object_id: 'other-list',
            object_type: 'list',
            fields: { name: 'other' },
          },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const items = projectedListItems(v);
    expect(items.map((i) => i.objectId)).toEqual([
      'bev-test-list-not-bad-advice-2',
      'other-list',
    ]);
    expect(items[0]?.name).toBe('test list not bad advice 2');
  });

  it('projectedListItems reads description and tagCategoryLabels from ref summary fields', () => {
    const v: ProjectedObjectView = {
      object_id: 'parent-list',
      object_type: 'list',
      semantic_type: null,
      weight: null,
      fields: {
        listItem: [
          {
            object_id: 'shop-1',
            object_type: 'shop',
            weight: 1.5,
            fields: {
              name: 'Italian Deli',
              image: 'https://example.com/img.jpg',
              description: 'Fresh pasta and sandwiches.',
              tagCategoryItem: [
                { category: 'cuisine', value: 'Italian' },
                { category: 'region', value: 'Europe' },
                { category: 'style', value: 'Casual' },
              ],
            },
          },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const items = projectedListItems(v);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      objectId: 'shop-1',
      objectType: 'shop',
      name: 'Italian Deli',
      imageUrl: 'https://example.com/img.jpg',
      description: 'Fresh pasta and sandwiches.',
      tagCategoryLabels: ['Europe', 'Casual'],
      weight: 1.5,
    });
  });

  it('projectedListItems reads price brand and parent from ref summary fields', () => {
    const v: ProjectedObjectView = {
      object_id: 'parent-list',
      object_type: 'list',
      semantic_type: null,
      weight: null,
      fields: {
        listItem: [
          {
            object_id: 'product-1',
            object_type: 'product',
            weight: 2,
            fields: {
              name: 'Macadamia Tincture',
              price: 'MX$225.00',
              brand: {
                object_id: 'brand-1',
                object_type: 'business',
                fields: { name: 'Itzayana' },
              },
              parent: {
                object_id: 'shop-1',
                object_type: 'shop',
                fields: { name: 'Miss Bitcoin Shop' },
              },
            },
          },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const items = projectedListItems(v);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      objectId: 'product-1',
      price: 'MX$225.00',
      brandRef: {
        objectId: 'brand-1',
        objectType: 'business',
        name: 'Itzayana',
        imageUrl: null,
      },
      parentRef: {
        objectId: 'shop-1',
        objectType: 'shop',
        name: 'Miss Bitcoin Shop',
        imageUrl: null,
      },
    });
  });

  it('falls back to listItem refs when menuItem updates are absent', () => {
    const v: ProjectedObjectView = {
      object_id: 'ylr-waivio',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        listItem: [
          {
            object_id: 'oxa-legal',
            object_type: 'list',
            fields: { name: 'Legal' },
          },
          {
            object_id: '6vcmab-tutorials',
            object_type: 'list',
            fields: { name: 'Tutorials' },
          },
          {
            object_id: 'mim-transform-your-passion-into-profit-with-waivio',
            object_type: 'page',
            fields: { name: 'Social Shopping' },
          },
        ],
        sortCustom: {
          include: [
            'mim-transform-your-passion-into-profit-with-waivio',
            '6vcmab-tutorials',
            'oxa-legal',
          ],
          exclude: [],
        },
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const items = resolveMenuItemsForView(v);
    expect(items.map((i) => i.displayTitle)).toEqual([
      'Tutorials',
      'Legal',
      'Social Shopping',
    ]);
    expect(items[0]?.link_to_object).toBe('6vcmab-tutorials');
    expect(items[0]?.object_type).toBe('list');
  });

  it('prefers menuItem updates over listItem fallback', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        menuItem: [
          { title: 'From menuItem', style: 'standard', link_to_web: 'https://example.com' },
        ],
        listItem: [
          { object_id: 'child-list', object_type: 'list', fields: { name: 'List child' } },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const items = resolveMenuItemsForView(v);
    expect(items).toHaveLength(1);
    expect(items[0]?.displayTitle).toBe('From menuItem');
  });

  it('parses identifier rows from projected fields.identifier', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        identifier: [{ type: 'TEST', value: '25011012' }],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedIdentifierRows(v)).toEqual([{ type: 'TEST', value: '25011012' }]);
  });

  it('parses productGroupId from projected fields.productGroupId', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'product',
      semantic_type: null,
      weight: null,
      fields: {
        productGroupId: 'acme-phone-x',
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
      hasExclusiveOwnership: false,
    };
    expect(projectedProductGroupId(v)).toBe('acme-phone-x');
  });

  it('uses embedded object name as displayTitle when title is missing', () => {
    const menu = [
      {
        style: 'standard',
        object_type: 'page',
        link_to_object: 'wsa-test-page',
        object: {
          object_id: 'wsa-test-page',
          object_type: 'page',
          fields: { name: 'Resolved page name', image: 'https://x/img' },
        },
      },
    ];
    const v = viewWithMenu(menu, null);
    const items = projectedMenuItems(v);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBeUndefined();
    expect(items[0]?.displayTitle).toBe('Resolved page name');
  });

  it('parses geo latitude/longitude from numeric strings', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'place',
      semantic_type: null,
      weight: null,
      fields: { geo: { latitude: '10.5', longitude: '-66.89' } },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedGeoLatLon(v)).toEqual({ latitude: 10.5, longitude: -66.89 });
  });

  it('parses GeoJSON Point on geo field', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'place',
      semantic_type: null,
      weight: null,
      fields: {
        geo: { type: 'Point', coordinates: [-66.89, 10.5] },
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedGeoLatLon(v)).toEqual({ latitude: 10.5, longitude: -66.89 });
  });

  it('groups tag categories and hides empty ones (tagCategory order)', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        tagCategory: ['Pros', 'Cons', 'Test', 'test kate'],
        tagCategoryItem: [
          { value: 'testingdi', category: 'Test' },
          { value: 'automation', category: 'Pros' },
          { value: 'development', category: 'Pros' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const sections = projectedTagCategorySections(v);
    expect(sections.map((s) => s.categoryTitle)).toEqual(['Pros', 'Test']);
    expect(sections[0].tags).toEqual([
      { value: 'automation' },
      { value: 'development' },
    ]);
    expect(sections[1].tags).toEqual([{ value: 'testingdi' }]);
  });

  it('preserves update_id on tagCategoryItem rows', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        tagCategory: ['Pros'],
        tagCategoryItem: [
          { value: 'automation', category: 'Pros', update_id: 'upd-1' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const sections = projectedTagCategorySections(v);
    expect(sections[0].tags).toEqual([{ value: 'automation', updateId: 'upd-1' }]);
  });

  it('mergeTagCategorySectionsForEditMode includes empty categories', () => {
    const sections = projectedTagCategorySections({
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        tagCategory: ['Pros', 'Cons'],
        tagCategoryItem: [{ value: 'a', category: 'Pros' }],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    });
    const merged = mergeTagCategorySectionsForEditMode(['Pros', 'Cons'], sections);
    expect(merged.map((s) => s.categoryTitle)).toEqual(['Pros', 'Cons']);
    expect(merged[0].tags).toEqual([{ value: 'a' }]);
    expect(merged[1].tags).toEqual([]);
  });

  it('formats wallet rows: optional title hides address line', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        walletAddress: [
          { symbol: 'Bitcoin (BTC)', address: 'bc1qaaa' },
          { title: 'You can support us with btc!', symbol: 'Bitcoin (BTC)', address: 'bc1qaaa' },
          { symbol: 'LBTC', address: 'test' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    const rows = projectedWalletAddressRows(v);
    expect(rows.map((r) => r.lineText)).toEqual([
      'Bitcoin: bc1qaaa',
      'You can support us with btc!',
      'Lightning Bitcoin: test',
    ]);
    expect(rows[0].iconSrc).toContain('/images/icons/cryptocurrencies/bitcoin.png');
    expect(rows[2].iconSrc).toContain('/images/icons/cryptocurrencies/lightning_bitcoin.png');
  });

  it('walletSymbolDisplayName shortens legacy symbol strings', () => {
    expect(walletSymbolDisplayName('Bitcoin (BTC)')).toBe('Bitcoin');
    expect(walletSymbolDisplayName('LBTC')).toBe('Lightning Bitcoin');
    expect(walletSymbolDisplayName('HIVE')).toBe('HIVE');
  });

  it('walletSymbolIconSrc maps known symbols to public cryptocurrency icons', () => {
    expect(walletSymbolIconSrc('Ethereum (ETH)')).toContain('ethereum.png');
    expect(walletSymbolIconSrc('HBD')).toContain('hbd.png');
    expect(walletSymbolIconSrc('WAIV')).toContain('waiv.png');
  });

  it('maps button rows to CTA title and href', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        button: [
          { title: 'Book now', link: 'https://example.com/book' },
          { title: 'Menu', link: 'https://example.com/menu' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedButtonItems(v)).toEqual([
      { title: 'Book now', href: 'https://example.com/book' },
      { title: 'Menu', href: 'https://example.com/menu' },
    ]);
  });

  it('maps link rows to Waivio-style icons and labels', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        link: [
          { type: 'twitter', value: 'x' },
          { type: 'youtube', value: 'ch' },
          { type: 'hive', value: 'acc' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedObjectLinkRows(v)).toEqual([
      { iconSrc: '/images/icons/twitter-x.svg', label: 'X', href: 'https://x.com/x' },
      { iconSrc: '/images/icons/social/youtube.svg', label: 'YouTube', href: 'https://www.youtube.com/@ch' },
      { iconSrc: '/images/icons/cryptocurrencies/hive.png', label: 'Hive', href: 'https://peakd.com/@acc' },
    ]);
    expect(linkKindDisplayLabel('linkedin')).toBe('LinkedIn');
    expect(linkKindPublicIconSrc('linkedin')).toContain('social/linkedin.svg');
  });

  it('passes through full URLs in link rows without platform prefix', () => {
    const instagramUrl = 'https://www.instagram.com/whitegarden_restaurant/';
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        link: [
          { type: 'instagram', value: instagramUrl },
          { type: 'instagram', value: 'whitegarden_restaurant' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
      hasExclusiveOwnership: false,
    };
    expect(projectedObjectLinkRows(v)).toEqual([
      {
        iconSrc: '/images/icons/social/instagram.svg',
        label: 'Instagram',
        href: instagramUrl,
      },
      {
        iconSrc: '/images/icons/social/instagram.svg',
        label: 'Instagram',
        href: 'https://instagram.com/whitegarden_restaurant',
      },
    ]);
  });

  it('reads parent from fields.parent projected RefSummary', () => {
    const v: ProjectedObjectView = {
      object_id: 'child',
      object_type: 'shop',
      semantic_type: null,
      weight: null,
      fields: {
        parent: {
          object_id: 'fcs-test-brand-02021105',
          object_type: 'business',
          fields: {
            image: 'https://waivio.example/image.png',
            name: 'test brand 02021105',
          },
        },
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedParentRow(v)).toEqual({
      objectId: 'fcs-test-brand-02021105',
      name: 'test brand 02021105',
      imageUrl: 'https://waivio.example/image.png',
    });
  });

  it('reads parent hoisted on resolve payload when preferred over nested location', () => {
    const v = {
      object_id: 'child',
      object_type: 'shop',
      semantic_type: null,
      weight: null,
      fields: {
        parent: {
          object_id: 'nested',
          object_type: 'business',
          fields: { name: 'Nested' },
        },
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
      parent: {
        object_id: 'root-pref',
        object_type: 'business',
        fields: { name: 'Root wins', image: 'https://a' },
      },
    };
    expect(projectedParentRow(v as unknown as ProjectedObjectView)).toEqual({
      objectId: 'root-pref',
      name: 'Root wins',
      imageUrl: 'https://a',
    });
  });

  it('parses telephone JSON entries with title and value', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        telephone: [
          { value: '+1 604-423-3447', title: 'Телефон' },
          { value: '+971-65315252' },
        ],
      },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedTelephoneEntries(v)).toEqual([
      { value: '+1 604-423-3447', title: 'Телефон' },
      { value: '+971-65315252' },
    ]);
  });

  it('parses legacy telephone string', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: { telephone: '+58 212-555-0100' },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedTelephoneEntries(v)).toEqual([{ value: '+58 212-555-0100' }]);
  });

  it('projects legalText from fields', () => {
    const v: ProjectedObjectView = {
      object_id: 'legal-1',
      object_type: 'legal_document',
      semantic_type: null,
      weight: null,
      fields: { legalText: '  <p>Terms</p>  ' },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedLegalText(v)).toBe('<p>Terms</p>');
    expect(projectedHostHtmlBody(v)).toBe('<p>Terms</p>');
  });

  it('prefers pageContent over legalText in projectedHostHtmlBody', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'page',
      semantic_type: null,
      weight: null,
      fields: { pageContent: 'Page body', legalText: 'Legal body' },
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
    };
    expect(projectedPageContent(v)).toBe('Page body');
    expect(projectedHostHtmlBody(v)).toBe('Page body');
  });

  it('maps viewerRank on previewGallery and galleryAlbums from API payload', () => {
    const v = {
      object_id: 'obj1',
      object_type: 'product',
      semantic_type: null,
      weight: null,
      fields: {},
      isFavorited: false,
      hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
      previewGallery: [
        {
          url: 'https://example.com/a.jpg',
          rankScore: 5000,
          viewerRank: 8000,
          isAvatar: false,
          update_id: 'g1',
        },
      ],
      galleryAlbums: [
        {
          name: 'Photos',
          items: [
            {
              url: 'https://example.com/b.jpg',
              rankScore: 3000,
              viewerRank: 6000,
              isAvatar: false,
              update_id: 'g2',
            },
          ],
        },
      ],
    } as ProjectedObjectView;

    expect(projectedPreviewGallery(v)[0]?.viewerRank).toBe(8000);
    expect(projectedGalleryAlbums(v)[0]?.items[0]?.viewerRank).toBe(6000);
  });
});

describe('projectedWidgetConfig', () => {
  const baseView = (fields: Record<string, unknown>): ProjectedObjectView => ({
    object_id: 'w1',
    object_type: 'widget',
    semantic_type: null,
    weight: null,
    fields,
    isFavorited: false,
    hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
  });

  it('parses plain object widget field', () => {
    expect(
      projectedWidgetConfig(
        baseView({ widget: { column: 'one', type: 'Widget', content: '<p>x</p>' } }),
      ),
    ).toEqual({ column: 'one', type: 'Widget', content: '<p>x</p>' });
  });

  it('uses first valid entry from widget array', () => {
    expect(
      projectedWidgetConfig(
        baseView({
          widget: [
            { column: 'one', type: 'Widget', content: '' },
            { column: 'two', type: 'Widget', content: '<p>ok</p>' },
          ],
        }),
      ),
    ).toEqual({ column: 'two', type: 'Widget', content: '<p>ok</p>' });
  });

  it('parses legacy stringified JSON widget field', () => {
    expect(
      projectedWidgetConfig(
        baseView({
          widget: JSON.stringify({ column: 'one', type: 'Widget', content: '<p>x</p>' }),
        }),
      ),
    ).toEqual({ column: 'one', type: 'Widget', content: '<p>x</p>' });
  });

  it('returns null for absent widget field', () => {
    expect(projectedWidgetConfig(baseView({}))).toBeNull();
  });

  it('returns null for malformed stringified JSON', () => {
    expect(projectedWidgetConfig(baseView({ widget: 'not-json{' }))).toBeNull();
  });

  it('returns null for empty widget array', () => {
    expect(projectedWidgetConfig(baseView({ widget: [] }))).toBeNull();
  });

  it('returns null for whitespace-only content', () => {
    expect(
      projectedWidgetConfig(
        baseView({ widget: { column: 'one', type: 'Widget', content: '   ' } }),
      ),
    ).toBeNull();
  });
});
