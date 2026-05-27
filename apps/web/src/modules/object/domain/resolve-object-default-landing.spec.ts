import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import {
  projectedListItems,
  projectedMenuItems,
  projectedSortCustom,
  resolveMenuItemsForView,
} from '../infrastructure/object-projected-fields';
import { resolveObjectDefaultLanding, applyDescriptionFallbackToDefaultLanding } from './resolve-object-default-landing';

const DEPS = {
  projectedMenuItems,
  projectedSortCustom,
  resolveMenuItemsForView,
  projectedListItems,
} as const;

function view(
  objectType: string,
  fields: Record<string, unknown>,
): ProjectedObjectView {
  return {
    object_id: 'host-obj',
    object_type: objectType,
    semantic_type: null,
    weight: null,
    fields,
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

describe('resolveObjectDefaultLanding', () => {
  it('returns hostContent for list host', () => {
    const landing = resolveObjectDefaultLanding(
      view('list', { listItem: [] }),
      'list',
      'list',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'hostContent' });
  });

  it('returns hostContent for page host', () => {
    const landing = resolveObjectDefaultLanding(
      view('page', { pageContent: 'hello' }),
      'page',
      'page',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'hostContent' });
  });

  it('returns nestedInHost for business with first menuItem list target', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {
        menuItem: [
          {
            title: 'Recipes',
            style: 'standard',
            link_to_object: 'recipes-list',
            object_type: 'list',
          },
        ],
      }),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'nestedInHost', targetObjectId: 'recipes-list' });
  });

  it('returns primaryTab reviews for business menuItem with external product target', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {
        menuItem: [
          {
            title: 'Shop item',
            style: 'standard',
            link_to_object: 'some-product',
            object_type: 'product',
          },
        ],
      }),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'primaryTab', segment: 'reviews' });
  });

  it('uses sortCustom.include first key for custom sort landing', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {
        menuItem: [
          { title: 'A', style: 'standard', link_to_web: 'https://a.example' },
          {
            title: 'List B',
            style: 'standard',
            link_to_object: 'list-b',
            object_type: 'list',
          },
        ],
        sortCustom: { include: ['list-b'], exclude: [] },
      }),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'nestedInHost', targetObjectId: 'list-b' });
  });

  it('returns hostContent for list host even when sortCustom is set', () => {
    const landing = resolveObjectDefaultLanding(
      view('list', {
        listItem: [{ object_id: 'child', object_type: 'page', fields: { name: 'P' } }],
        sortCustom: { include: ['child'], exclude: [] },
      }),
      'list',
      'list',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'hostContent' });
  });

  it('returns nestedInHost from legacy listItem when menuItem is absent', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {
        listItem: [
          { object_id: 'nested-list', object_type: 'list', fields: { name: 'Nested' } },
        ],
        sortCustom: { include: ['nested-list'], exclude: [] },
      }),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'nestedInHost', targetObjectId: 'nested-list' });
  });

  it('returns primaryTab reviews for empty business object', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {}),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'primaryTab', segment: 'reviews' });
  });

  it('returns routeStub for newsFilter when no menu or listItem', () => {
    const landing = resolveObjectDefaultLanding(
      view('business', {
        newsFilter: [{ permlink: 'news-1', title: 'News' }],
      }),
      'default',
      'business',
      DEPS,
    );
    expect(landing).toEqual({ kind: 'routeStub', segment: 'newsFilter', ref: 'news-1' });
  });
});

describe('applyDescriptionFallbackToDefaultLanding', () => {
  it('opens description when default is reviews, no posts, and description exists', () => {
    const landing = applyDescriptionFallbackToDefaultLanding(
      { kind: 'primaryTab', segment: 'reviews' },
      { postsCount: 0, hasDescriptionPageContent: true },
    );
    expect(landing).toEqual({ kind: 'primaryTab', segment: 'description' });
  });

  it('keeps reviews when posts exist', () => {
    const landing = applyDescriptionFallbackToDefaultLanding(
      { kind: 'primaryTab', segment: 'reviews' },
      { postsCount: 3, hasDescriptionPageContent: true },
    );
    expect(landing).toEqual({ kind: 'primaryTab', segment: 'reviews' });
  });

  it('keeps reviews when no description content', () => {
    const landing = applyDescriptionFallbackToDefaultLanding(
      { kind: 'primaryTab', segment: 'reviews' },
      { postsCount: 0, hasDescriptionPageContent: false },
    );
    expect(landing).toEqual({ kind: 'primaryTab', segment: 'reviews' });
  });

  it('does not override nestedInHost landing', () => {
    const landing = applyDescriptionFallbackToDefaultLanding(
      { kind: 'nestedInHost', targetObjectId: 'child-list' },
      { postsCount: 0, hasDescriptionPageContent: true },
    );
    expect(landing).toEqual({ kind: 'nestedInHost', targetObjectId: 'child-list' });
  });
});
