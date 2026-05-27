import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedField, ResolvedObjectView, ResolvedUpdate } from '@opden-data-layer/objects-domain';

import type { RefSummary } from './projected-object.types';
import { emptyRankVoteProjection } from './projected-object.types';
import { collectObjectRefIdsFromView, projectObjectCore } from './project-object';

function baseView(fields: Record<string, ResolvedField>): ResolvedObjectView {
  return {
    object_id: 'obj-1',
    object_type: 'business',
    creator: 'creator',
    weight: null,
    meta_group_id: null,
    canonical: null,
    fields,
  };
}

function resolvedUpdate(overrides: Partial<ResolvedUpdate> = {}): ResolvedUpdate {
  return {
    update_id: 'upd-1',
    update_type: UPDATE_TYPES.MENU_ITEM,
    creator: 'alice',
    locale: null,
    created_at_unix: 0,
    event_seq: BigInt(0),
    value_text: null,
    value_geo: null,
    value_json: null,
    validity_status: 'VALID',
    validity_tier: 'baseline',
    decisive_vote_event_seq: null,
    approve_percent: 100,
    field_weight: null,
    rank_score: null,
    rank_context: null,
    rank_decisive_event_seq: null,
    ...overrides,
  };
}

describe('collectObjectRefIdsFromView', () => {
  it('collects object_ref ids and menuItem link_to_object', () => {
    const view = baseView({
      parent: {
        update_type: UPDATE_TYPES.PARENT,
        cardinality: 'single',
        values: [
          resolvedUpdate({
            update_type: UPDATE_TYPES.PARENT,
            value_text: 'parent-id-1',
          }),
        ],
      },
      menuItem: {
        update_type: UPDATE_TYPES.MENU_ITEM,
        cardinality: 'multi',
        values: [
          resolvedUpdate({
            value_json: {
              style: 'standard',
              link_to_object: '  menu-ref-1 ',
              object_type: 'page',
            },
          }),
          resolvedUpdate({
            value_json: {
              style: 'highlight',
              title: 'Web',
              link_to_web: 'https://example.com',
            },
          }),
        ],
      },
    });

    const ids = collectObjectRefIdsFromView(view);
    expect(ids.sort()).toEqual(['menu-ref-1', 'parent-id-1'].sort());
  });

  it('skips non-VALID menu rows and rows without link_to_object', () => {
    const view = baseView({
      menuItem: {
        update_type: UPDATE_TYPES.MENU_ITEM,
        cardinality: 'multi',
        values: [
          resolvedUpdate({
            validity_status: 'REJECTED',
            value_json: { style: 'a', link_to_object: 'rej', object_type: 'page' },
          }),
          resolvedUpdate({
            value_json: { style: 'a', title: 'W', link_to_web: 'https://a.com' },
          }),
        ],
      },
    });
    expect(collectObjectRefIdsFromView(view)).toEqual([]);
  });
});

describe('projectObjectCore menuItem', () => {
  const refMap = new Map<string, RefSummary>([
    [
      'ref-page',
      {
        object_id: 'ref-page',
        object_type: 'page',
        fields: { name: 'Page title', image: 'https://x/img.png' },
        weight: null,
      },
    ],
  ]);

  it('embeds RefSummary on rows with link_to_object and leaves web-only rows unchanged', () => {
    const view = baseView({
      menuItem: {
        update_type: UPDATE_TYPES.MENU_ITEM,
        cardinality: 'multi',
        values: [
          resolvedUpdate({
            value_json: {
              style: 'standard',
              object_type: 'page',
              link_to_object: 'ref-page',
            },
          }),
          resolvedUpdate({
            value_json: {
              style: 'default',
              title: 'Shop',
              link_to_web: 'https://shop.example',
            },
          }),
        ],
      },
    });

    const core = projectObjectCore({
      view,
      ipfsGatewayBaseUrl: 'https://ipfs.io',
      refSummariesById: refMap,
      rankVoteProjection: emptyRankVoteProjection(),
    });

    const menu = core.fields.menuItem;
    expect(Array.isArray(menu)).toBe(true);
    const rows = menu as Record<string, unknown>[];
    expect(rows[0]?.object).toEqual(refMap.get('ref-page'));
    expect(rows[1]?.object).toBeUndefined();
  });
});

describe('projectObjectCore listItem', () => {
  it('embeds addedAtUnix from the parent listItem update on each ref summary', () => {
    const refMap = new Map<string, RefSummary>([
      [
        'child-a',
        {
          object_id: 'child-a',
          object_type: 'page',
          fields: { name: 'A' },
          weight: 1,
        },
      ],
      [
        'child-b',
        {
          object_id: 'child-b',
          object_type: 'page',
          fields: { name: 'B' },
          weight: 2,
        },
      ],
    ]);

    const view = baseView({
      listItem: {
        update_type: UPDATE_TYPES.LIST_ITEM,
        cardinality: 'multi',
        values: [
          resolvedUpdate({
            update_type: UPDATE_TYPES.LIST_ITEM,
            value_text: 'child-a',
            created_at_unix: 100,
          }),
          resolvedUpdate({
            update_type: UPDATE_TYPES.LIST_ITEM,
            value_text: 'child-b',
            created_at_unix: 200,
          }),
        ],
      },
    });

    const core = projectObjectCore({
      view,
      ipfsGatewayBaseUrl: 'https://ipfs.io',
      refSummariesById: refMap,
      rankVoteProjection: emptyRankVoteProjection(),
    });

    const listItem = core.fields.listItem as RefSummary[];
    expect(listItem.map((s) => s.object_id)).toEqual(['child-a', 'child-b']);
    expect(listItem.map((s) => s.addedAtUnix)).toEqual([100, 200]);
  });
});

describe('projectObjectCore avatar fallback', () => {
  it('uses parent image when object has no image', () => {
    const refMap = new Map<string, RefSummary>([
      [
        'parent-1',
        {
          object_id: 'parent-1',
          object_type: 'business',
          fields: {
            name: 'Sushi Mura',
            image: 'https://cdn.example/parent.png',
          },
          weight: null,
        },
      ],
    ]);

    const view = baseView({
      parent: {
        update_type: UPDATE_TYPES.PARENT,
        cardinality: 'single',
        values: [
          resolvedUpdate({
            update_type: UPDATE_TYPES.PARENT,
            value_text: 'parent-1',
          }),
        ],
      },
    });

    const core = projectObjectCore({
      view,
      ipfsGatewayBaseUrl: 'https://ipfs.io',
      refSummariesById: refMap,
      rankVoteProjection: emptyRankVoteProjection(),
    });

    expect(core.fields.image).toBe('https://cdn.example/parent.png');
  });

  it('keeps own image when present', () => {
    const refMap = new Map<string, RefSummary>([
      [
        'parent-1',
        {
          object_id: 'parent-1',
          object_type: 'business',
          fields: {
            name: 'Sushi Mura',
            image: 'https://cdn.example/parent.png',
          },
          weight: null,
        },
      ],
    ]);

    const view = baseView({
      image: {
        update_type: UPDATE_TYPES.IMAGE,
        cardinality: 'single',
        values: [
          resolvedUpdate({
            update_type: UPDATE_TYPES.IMAGE,
            value_text: 'https://cdn.example/own.png',
          }),
        ],
      },
      parent: {
        update_type: UPDATE_TYPES.PARENT,
        cardinality: 'single',
        values: [
          resolvedUpdate({
            update_type: UPDATE_TYPES.PARENT,
            value_text: 'parent-1',
          }),
        ],
      },
    });

    const core = projectObjectCore({
      view,
      ipfsGatewayBaseUrl: 'https://ipfs.io',
      refSummariesById: refMap,
      rankVoteProjection: emptyRankVoteProjection(),
    });

    expect(core.fields.image).toBe('https://cdn.example/own.png');
  });
});
