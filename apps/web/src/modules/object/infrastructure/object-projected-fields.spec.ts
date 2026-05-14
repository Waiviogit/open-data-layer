import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import {
  applySortCustomToMenuItems,
  projectedGeoLatLon,
  projectedIdentifierRows,
  projectedMenuItems,
  projectedSortCustom,
  projectedTagCategorySections,
  projectedWalletAddressRows,
  projectedObjectLinkRows,
  projectedParentRow,
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
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
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

  it('parses identifier rows from projected fields.identifier', () => {
    const v: ProjectedObjectView = {
      object_id: 'x',
      object_type: 'business',
      semantic_type: null,
      weight: null,
      fields: {
        identifier: [{ type: 'TEST', value: '25011012' }],
      },
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    expect(projectedIdentifierRows(v)).toEqual([{ type: 'TEST', value: '25011012' }]);
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    const sections = projectedTagCategorySections(v);
    expect(sections.map((s) => s.categoryTitle)).toEqual(['Pros', 'Test']);
    expect(sections[0].values).toEqual(['automation', 'development']);
    expect(sections[1].values).toEqual(['testingdi']);
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };
    expect(projectedObjectLinkRows(v)).toEqual([
      { iconSrc: '/images/icons/twitter-x.svg', label: 'X' },
      { iconSrc: '/images/icons/social/youtube.svg', label: 'YouTube' },
      { iconSrc: '/images/icons/cryptocurrencies/hive.png', label: 'Hive' },
    ]);
    expect(linkKindDisplayLabel('linkedin')).toBe('LinkedIn');
    expect(linkKindPublicIconSrc('linkedin')).toContain('social/linkedin.svg');
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
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
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
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
});
