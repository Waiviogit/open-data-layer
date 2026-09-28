import {
  DETAILS_PRIMARY_TAB_SEGMENT,
  OBJECT_PAGE_CATEGORY_NAME_PARAM,
  OBJECT_PAGE_CATEGORY_PATH_SEGMENT,
  OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM,
  OBJECT_PAGE_FIELD_REFERENCES_PATH_SEGMENT,
  buildObjectFieldReferencesPath,
  resolveFieldReferenceTypeForObjectPage,
  resolveFieldReferenceTypeFromObjectUrl,
} from '@/modules/object/domain/object-page-url.constants';
import {
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  OBJECT_PAGE_VIEW_PATH_PARAM,
  resolveCategoryNameForObjectPage,
  resolveCategoryNameFromObjectUrl,
  resolveGalleryAlbumForObjectPage,
  resolveGalleryAlbumFromObjectUrl,
  resolveDefaultPrimarySegmentFromLanding,
  resolvePrimarySegmentForObjectPage,
  resolvePrimarySegmentFromObjectUrl,
  resolveReviewsFeedSubFromObjectUrl,
  resolveUpdateIdFromObjectUrl,
  sanitizeNestedStack,
} from './object-page-search';
import { buildObjectPrimaryTabNavigation } from './object-page-navigation';
import { buildObjectWidgetPath } from '@/modules/object/domain/object-page-url.constants';

describe('resolvePrimarySegmentForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('returns explicit path segment reviews', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/reviews`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('reviews');
  });

  it('maps legacy /messages path to reviews primary tab', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/messages`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('reviews');
  });

  it('maps /reviews/messages path to reviews primary tab', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/reviews/messages`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('reviews');
  });

  it('returns explicit path segment description', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/description`,
        new URLSearchParams(),
        '',
      ),
    ).toBe(OBJECT_PAGE_DESCRIPTION_SEGMENT);
  });

  it('returns explicit path segment gallery', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/gallery`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('gallery');
  });

  it('returns explicit path segment experts', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/experts`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('experts');
  });

  it('returns explicit path segment widget', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/widget`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('widget');
  });

  it('returns explicit ?tab= over default landing', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_PRIMARY_TAB_PARAM, 'updates');
    expect(resolvePrimarySegmentForObjectPage(objectId, base, sp, 'reviews')).toBe('updates');
  });

  it('returns default segment when ?path= is present on clean pathname', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_VIEW_PATH_PARAM, 'nested-list');
    expect(resolvePrimarySegmentForObjectPage(objectId, base, sp, 'reviews')).toBe('reviews');
  });

  it('returns details segment when ?path= is present and Details is default', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_VIEW_PATH_PARAM, 'nested-list');
    expect(
      resolvePrimarySegmentForObjectPage(objectId, base, sp, DETAILS_PRIMARY_TAB_SEGMENT),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('falls back to default landing segment on clean URL', () => {
    expect(
      resolvePrimarySegmentForObjectPage(objectId, base, new URLSearchParams(), 'reviews'),
    ).toBe('reviews');
  });

  it('falls back to empty segment on clean URL for nested default landing', () => {
    expect(
      resolvePrimarySegmentForObjectPage(objectId, base, new URLSearchParams(), ''),
    ).toBe('');
  });
});

describe('resolveDefaultPrimarySegmentFromLanding', () => {
  const tabs = ['reviews', 'updates', 'gallery'] as const;
  const tabsWithDetails = ['details', 'reviews', 'updates', 'gallery'] as const;

  it('maps primaryTab reviews', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding({ kind: 'primaryTab', segment: 'reviews' }, tabs),
    ).toBe('reviews');
  });

  it('maps primaryTab reviews to details when Details tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'primaryTab', segment: 'reviews' },
        tabsWithDetails,
      ),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('maps primaryTab description', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'primaryTab', segment: 'description' },
        tabs,
      ),
    ).toBe(OBJECT_PAGE_DESCRIPTION_SEGMENT);
  });

  it('maps primaryTab description to details when Details tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'primaryTab', segment: 'description' },
        tabsWithDetails,
      ),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('maps nestedInHost to details when Details tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'nestedInHost', targetObjectId: 'menu-list-1' },
        tabsWithDetails,
      ),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('maps hostContent to details when Details tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding({ kind: 'hostContent' }, tabsWithDetails),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('maps primaryTab widget when tab exists', () => {
    const widgetTabs = ['widget', 'reviews', 'updates'] as const;
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'primaryTab', segment: 'widget' },
        widgetTabs,
      ),
    ).toBe('widget');
  });

  it('returns empty for widget landing when tab not in primaryTabs', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'primaryTab', segment: 'widget' },
        tabs,
      ),
    ).toBe('');
  });

  it('maps routeStub to reviews when tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'routeStub', segment: 'blog', ref: 'alice' },
        tabs,
      ),
    ).toBe('reviews');
  });

  it('maps routeStub to details when Details tab exists', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding(
        { kind: 'routeStub', segment: 'blog', ref: 'alice' },
        tabsWithDetails,
      ),
    ).toBe(DETAILS_PRIMARY_TAB_SEGMENT);
  });

  it('returns empty for hostContent', () => {
    expect(
      resolveDefaultPrimarySegmentFromLanding({ kind: 'hostContent' }, tabs),
    ).toBe('');
  });
});

describe('resolvePrimarySegmentFromObjectUrl', () => {
  it('returns empty for bare object path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl('abc', '/object/abc', new URLSearchParams()),
    ).toBe('');
  });

  it('returns gallery for album drill-down path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl(
        'abc',
        '/object/abc/gallery/album/Photos',
        new URLSearchParams(),
      ),
    ).toBe('gallery');
  });

  it('returns category for category feed path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl(
        'abc',
        `/object/abc/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/Active%20Skirts`,
        new URLSearchParams(),
      ),
    ).toBe(OBJECT_PAGE_CATEGORY_PATH_SEGMENT);
  });

  it('returns updates for update detail path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl(
        'abc',
        '/object/abc/updates/upd-1',
        new URLSearchParams(),
      ),
    ).toBe('updates');
  });

  it('returns field-references for legacy books feed path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl(
        'abc',
        '/object/abc/books',
        new URLSearchParams(),
      ),
    ).toBe(OBJECT_PAGE_FIELD_REFERENCES_PATH_SEGMENT);
  });
});

describe('resolveFieldReferenceTypeFromObjectUrl', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('decodes reference object type from legacy books path', () => {
    expect(resolveFieldReferenceTypeFromObjectUrl(objectId, `${base}/books`)).toBe('book');
  });

  it('decodes reference object type from legacy products path', () => {
    expect(resolveFieldReferenceTypeFromObjectUrl(objectId, `${base}/products`)).toBe(
      'product',
    );
  });

  it('decodes service catalog field-reference paths', () => {
    expect(resolveFieldReferenceTypeFromObjectUrl(objectId, `${base}/service-offers`)).toBe(
      'service_offer',
    );
    expect(resolveFieldReferenceTypeFromObjectUrl(objectId, `${base}/service-requests`)).toBe(
      'service_request',
    );
  });

  it('returns null for unrelated paths', () => {
    expect(
      resolveFieldReferenceTypeFromObjectUrl(objectId, `${base}/reviews`),
    ).toBeNull();
  });
});

describe('resolveFieldReferenceTypeForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('prefers pathname over query param', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM, encodeURIComponent('product'));
    expect(resolveFieldReferenceTypeForObjectPage(objectId, `${base}/books`, sp)).toBe(
      'book',
    );
  });

  it('falls back to query param when pathname has no field reference type', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM, encodeURIComponent('product'));
    expect(resolveFieldReferenceTypeForObjectPage(objectId, base, sp)).toBe('product');
  });
});

describe('buildObjectFieldReferencesPath', () => {
  it('builds legacy plural public URLs', () => {
    expect(buildObjectFieldReferencesPath('alice', 'book')).toBe('/object/alice/books');
    expect(buildObjectFieldReferencesPath('biz', 'product')).toBe('/object/biz/products');
  });
});

describe('resolveUpdateIdFromObjectUrl', () => {
  it('decodes update id from path', () => {
    expect(
      resolveUpdateIdFromObjectUrl('abc', '/object/abc/updates/upd-1'),
    ).toBe('upd-1');
  });

  it('returns null for updates list path', () => {
    expect(resolveUpdateIdFromObjectUrl('abc', '/object/abc/updates')).toBe(null);
  });
});

describe('resolveCategoryNameFromObjectUrl', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('decodes category name from path', () => {
    expect(
      resolveCategoryNameFromObjectUrl(
        objectId,
        `${base}/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/${encodeURIComponent('Active Skirts')}`,
      ),
    ).toBe('Active Skirts');
  });

  it('returns null for unrelated paths', () => {
    expect(resolveCategoryNameFromObjectUrl(objectId, `${base}/reviews`)).toBeNull();
  });
});

describe('resolveCategoryNameForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('prefers pathname over query param', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_CATEGORY_NAME_PARAM, encodeURIComponent('Other'));
    expect(
      resolveCategoryNameForObjectPage(
        objectId,
        `${base}/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/${encodeURIComponent('Active Skirts')}`,
        sp,
      ),
    ).toBe('Active Skirts');
  });

  it('falls back to query param when pathname has no category', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_CATEGORY_NAME_PARAM, encodeURIComponent('Skirts'));
    expect(resolveCategoryNameForObjectPage(objectId, base, sp)).toBe('Skirts');
  });
});

describe('resolveGalleryAlbumFromObjectUrl', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('returns null on albums list path', () => {
    expect(resolveGalleryAlbumFromObjectUrl(objectId, `${base}/gallery`)).toBeNull();
  });

  it('decodes album name from path', () => {
    expect(
      resolveGalleryAlbumFromObjectUrl(objectId, `${base}/gallery/album/Photos`),
    ).toBe('Photos');
  });

  it('decodes encoded album names', () => {
    expect(
      resolveGalleryAlbumFromObjectUrl(
        objectId,
        `${base}/gallery/album/${encodeURIComponent('My album')}`,
      ),
    ).toBe('My album');
  });

  it('returns null for unrelated paths', () => {
    expect(resolveGalleryAlbumFromObjectUrl(objectId, `${base}/reviews`)).toBeNull();
  });
});

describe('resolveGalleryAlbumForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('prefers pathname over query param', () => {
    const sp = new URLSearchParams();
    sp.set('gallery_album', 'Other');
    expect(
      resolveGalleryAlbumForObjectPage(
        objectId,
        `${base}/gallery/album/Photos`,
        sp,
      ),
    ).toBe('Photos');
  });

  it('falls back to query param when pathname has no album', () => {
    const sp = new URLSearchParams();
    sp.set('gallery_album', encodeURIComponent('Menu shots'));
    expect(resolveGalleryAlbumForObjectPage(objectId, `${base}/gallery`, sp)).toBe(
      'Menu shots',
    );
  });
});

describe('sanitizeNestedStack', () => {
  it('returns empty stack when path ids were requested but nothing resolved', () => {
    expect(sanitizeNestedStack(['a', 'b'], [])).toEqual([]);
  });

  it('keeps stack when it matches path prefix', () => {
    const stack = [
      {
        objectId: 'a',
        name: 'A',
        objectType: 'list' as const,
        listItems: [],
        listItemsSortCustom: null,
        pageContentHtml: null,
        widgetConfig: null,
      },
    ];
    expect(sanitizeNestedStack(['a'], stack)).toEqual(stack);
  });

  it('returns empty when stack ids do not match requested path', () => {
    const stack = [
      {
        objectId: 'wrong',
        name: 'X',
        objectType: 'list' as const,
        listItems: [],
        listItemsSortCustom: null,
        pageContentHtml: null,
        widgetConfig: null,
      },
    ];
    expect(sanitizeNestedStack(['a'], stack)).toEqual([]);
  });
});

describe('buildObjectPrimaryTabNavigation details', () => {
  const objectId = 'rest-1';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('navigates to clean object path with replace and clears path param', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_VIEW_PATH_PARAM, 'nested');
    sp.set('sub', 'administrative');
    const nav = buildObjectPrimaryTabNavigation(objectId, DETAILS_PRIMARY_TAB_SEGMENT, sp);
    expect(nav).toEqual({
      href: base,
      method: 'replace',
    });
    expect(nav.href).not.toContain('/details');
    expect(nav.href).not.toContain('path=');
    expect(nav.href).not.toContain('sub=');
  });

  it('clears locale filter param on details navigation', () => {
    const sp = new URLSearchParams();
    sp.set('locale', 'fr-FR');
    const nav = buildObjectPrimaryTabNavigation(objectId, DETAILS_PRIMARY_TAB_SEGMENT, sp);
    expect(nav.href).toBe(base);
  });
});

describe('buildObjectPrimaryTabNavigation widget', () => {
  const objectId = 'podcast-1';

  it('navigates to widget path with replace and clears path param', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_VIEW_PATH_PARAM, 'nested');
    sp.set('sub', 'administrative');
    const nav = buildObjectPrimaryTabNavigation(objectId, 'widget', sp);
    expect(nav).toEqual({
      href: buildObjectWidgetPath(objectId),
      method: 'replace',
    });
    expect(nav.href).not.toContain('path=');
    expect(nav.href).not.toContain('sub=');
  });

  it('clears locale filter param on widget navigation', () => {
    const sp = new URLSearchParams();
    sp.set('locale', 'fr-FR');
    const nav = buildObjectPrimaryTabNavigation(objectId, 'widget', sp);
    expect(nav.href).toBe(buildObjectWidgetPath(objectId));
  });
});

describe('resolvePrimarySegmentFromObjectUrl widget', () => {
  it('resolves legacy ?tab=widget on bare object path', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_PRIMARY_TAB_PARAM, 'widget');
    expect(resolvePrimarySegmentFromObjectUrl('abc', '/object/abc', sp)).toBe('widget');
  });

  it('prefers pathname widget segment over conflicting ?tab=', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_PRIMARY_TAB_PARAM, 'reviews');
    expect(resolvePrimarySegmentFromObjectUrl('abc', '/object/abc/widget', sp)).toBe('widget');
  });
});

describe('resolveReviewsFeedSubFromObjectUrl', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('returns posts for bare reviews path', () => {
    expect(
      resolveReviewsFeedSubFromObjectUrl(objectId, `${base}/reviews`, new URLSearchParams()),
    ).toBe('posts');
  });

  it('returns activity from reviews sub-path', () => {
    expect(
      resolveReviewsFeedSubFromObjectUrl(
        objectId,
        `${base}/reviews/activity`,
        new URLSearchParams(),
      ),
    ).toBe('activity');
  });

  it('maps legacy /reviews/messages path to activity', () => {
    expect(
      resolveReviewsFeedSubFromObjectUrl(
        objectId,
        `${base}/reviews/messages`,
        new URLSearchParams(),
      ),
    ).toBe('activity');
  });

  it('maps legacy /messages path to activity', () => {
    expect(
      resolveReviewsFeedSubFromObjectUrl(objectId, `${base}/messages`, new URLSearchParams()),
    ).toBe('activity');
  });

  it('returns threads from proxy query param', () => {
    const sp = new URLSearchParams();
    sp.set('reviews_sub', 'threads');
    expect(resolveReviewsFeedSubFromObjectUrl(objectId, base, sp)).toBe('threads');
  });
});
