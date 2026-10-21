import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedField } from '@opden-data-layer/objects-domain';
import type { RankVoteProjection } from './projected-object.types';
import { geoJsonPointToLatLon, projectFieldValue } from './project-field';

describe('projectFieldValue aggregateRating', () => {
  it('returns an array aspect row with totals and viewer rank', () => {
    const field: ResolvedField = {
      update_type: 'aggregateRating',
      cardinality: 'multi',
      values: [
        {
          update_id: 'u1',
          update_type: 'aggregateRating',
          creator: 'c',
          locale: 'en-US',
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: 'Overall',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 8000,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
        {
          update_id: 'u2',
          update_type: 'aggregateRating',
          creator: 'c',
          locale: 'en-US',
          created_at_unix: 1,
          event_seq: BigInt(2),
          value_text: 'Value',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 10000,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    const rankVp: RankVoteProjection = {
      countByUpdateId: new Map([
        ['u1', 10],
        ['u2', 200],
      ]),
      viewerRankByUpdateId: new Map([
        ['u1', 7000],
        ['u2', 9000],
      ]),
    };
    const out = projectFieldValue(field, UPDATE_TYPES.AGGREGATE_RATING, 'https://ipfs.io', 'alice', rankVp);
    expect(out).toEqual([
      {
        update_id: 'u1',
        dimension: 'Overall',
        averageRating: 8000,
        userRating: 7000,
        totalVoters: 10,
      },
      {
        update_id: 'u2',
        dimension: 'Value',
        averageRating: 10000,
        userRating: 9000,
        totalVoters: 200,
      },
    ]);
  });

  it('sets userRating null when viewer has no votes', () => {
    const field: ResolvedField = {
      update_type: 'aggregateRating',
      cardinality: 'multi',
      values: [
        {
          update_id: 'u1',
          update_type: 'aggregateRating',
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: 'X',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 5000,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    const rankVp: RankVoteProjection = {
      countByUpdateId: new Map([['u1', 3]]),
      viewerRankByUpdateId: new Map(),
    };
    expect(
      projectFieldValue(field, UPDATE_TYPES.AGGREGATE_RATING, 'https://ipfs.io', 'alice', rankVp),
    ).toEqual([
      { update_id: 'u1', dimension: 'X', averageRating: 5000, userRating: null, totalVoters: 3 },
    ]);
    expect(projectFieldValue(field, UPDATE_TYPES.AGGREGATE_RATING, 'https://ipfs.io', undefined, rankVp)).toEqual([
      { update_id: 'u1', dimension: 'X', averageRating: 5000, userRating: null, totalVoters: 3 },
    ]);
  });
});

describe('projectFieldValue imageGalleryItem', () => {
  it('projects url and rank_score from valid updates', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
      cardinality: 'multi',
      values: [
        {
          update_id: 'g1',
          update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: null,
          value_geo: null,
          value_json: { album: 'Photos', url: 'https://example.com/a.jpg' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 7500,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.IMAGE_GALLERY_ITEM, 'https://ipfs.io')).toEqual([
      {
        album: 'Photos',
        url: 'https://example.com/a.jpg',
        rank_score: 7500,
        viewer_rank: null,
        update_id: 'g1',
      },
    ]);
  });

  it('includes viewer_rank from rankVoteProjection', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
      cardinality: 'multi',
      values: [
        {
          update_id: 'g1',
          update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: null,
          value_geo: null,
          value_json: { album: 'Photos', url: 'https://example.com/a.jpg' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 7500,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    const rankVp: RankVoteProjection = {
      countByUpdateId: new Map([['g1', 2]]),
      viewerRankByUpdateId: new Map([['g1', 9000]]),
    };
    expect(
      projectFieldValue(field, UPDATE_TYPES.IMAGE_GALLERY_ITEM, 'https://ipfs.io', 'alice', rankVp),
    ).toEqual([
      {
        album: 'Photos',
        url: 'https://example.com/a.jpg',
        rank_score: 7500,
        viewer_rank: 9000,
        update_id: 'g1',
      },
    ]);
  });
});

describe('projectFieldValue affiliateButton', () => {
  const baseRow = {
    update_id: 'btn-1',
    update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
    creator: 'c',
    locale: null,
    created_at_unix: 1,
    event_seq: BigInt(1),
    value_text: null as string | null,
    value_geo: null,
    value_json: null as unknown,
    validity_status: 'VALID' as const,
    validity_tier: 'baseline' as const,
    approve_percent: 100,
    field_weight: null,
    decisive_vote_event_seq: null,
    rank_score: null,
    rank_context: null,
    rank_decisive_event_seq: null,
  };

  it('projects a URL button as a display string', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
      cardinality: 'single',
      values: [{ ...baseRow, value_json: { url: 'https://img/btn.png' } }],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.AFFILIATE_BUTTON, undefined)).toBe(
      'https://img/btn.png',
    );
  });

  it('projects a CID button through the content gateway', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
      cardinality: 'single',
      values: [{ ...baseRow, value_json: { cid: 'bafyButton' } }],
    };
    expect(
      projectFieldValue(field, UPDATE_TYPES.AFFILIATE_BUTTON, 'https://ipfs.example'),
    ).toBe('https://ipfs.example/ipfs-gateway/content/image/bafyButton');
  });
});

describe('projectFieldValue tagCategoryItem', () => {
  it('projects category, value, and update_id from valid updates', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
      cardinality: 'multi',
      values: [
        {
          update_id: 't1',
          update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: null,
          value_geo: null,
          value_json: { category: 'Cuisine', value: 'japanese' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.TAG_CATEGORY_ITEM, undefined)).toEqual([
      {
        category: 'Cuisine',
        value: 'japanese',
        update_id: 't1',
      },
    ]);
  });
});

describe('projectFieldValue user_ref', () => {
  it('projects multi-cardinality user_ref as string array', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.ADMINS,
      cardinality: 'multi',
      values: [
        {
          update_id: 'a1',
          update_type: UPDATE_TYPES.ADMINS,
          creator: 'creator',
          locale: null,
          created_at_unix: 0,
          event_seq: BigInt(0),
          value_text: 'alice',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
        {
          update_id: 'a2',
          update_type: UPDATE_TYPES.ADMINS,
          creator: 'creator',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: 'bob',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.ADMINS, undefined)).toEqual(['alice', 'bob']);
  });

  it('projects single-cardinality user_ref as string', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.DELEGATION,
      cardinality: 'single',
      values: [
        {
          update_id: 'd1',
          update_type: UPDATE_TYPES.DELEGATION,
          creator: 'creator',
          locale: null,
          created_at_unix: 0,
          event_seq: BigInt(0),
          value_text: 'alice',
          value_geo: null,
          value_json: null,
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.DELEGATION, undefined)).toBe('alice');
  });
});

describe('projectFieldValue metadata', () => {
  it('folds key/value rows into a record (first wins on duplicate keys)', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.METADATA,
      cardinality: 'multi',
      values: [
        {
          update_id: 'u1',
          update_type: UPDATE_TYPES.METADATA,
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(1),
          value_text: null,
          value_geo: null,
          value_json: { key: 'author', value: 'alice' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 100,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
        {
          update_id: 'u2',
          update_type: UPDATE_TYPES.METADATA,
          creator: 'c',
          locale: null,
          created_at_unix: 2,
          event_seq: BigInt(2),
          value_text: null,
          value_geo: null,
          value_json: { key: 'author', value: 'bob' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: 50,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
        {
          update_id: 'u3',
          update_type: UPDATE_TYPES.METADATA,
          creator: 'c',
          locale: null,
          created_at_unix: 3,
          event_seq: BigInt(3),
          value_text: null,
          value_geo: null,
          value_json: { key: 'version', value: '1' },
          validity_status: 'VALID',
          validity_tier: 'baseline',
          approve_percent: 100,
          field_weight: null,
          decisive_vote_event_seq: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        },
      ],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.METADATA, undefined)).toEqual({
      author: 'alice',
      version: '1',
    });
  });

  it('returns null when no valid rows', () => {
    const field: ResolvedField = {
      update_type: UPDATE_TYPES.METADATA,
      cardinality: 'multi',
      values: [],
    };
    expect(projectFieldValue(field, UPDATE_TYPES.METADATA, undefined)).toBeNull();
  });
});

describe('geoJsonPointToLatLon', () => {
  const expected = { latitude: 49.187253, longitude: -123.131515 };

  it('parses GeoJSON Point', () => {
    expect(
      geoJsonPointToLatLon({
        type: 'Point',
        coordinates: [-123.131515, 49.187253],
      }),
    ).toEqual(expected);
  });

  it('parses OGC WKB Point (little-endian, no SRID)', () => {
    const b = Buffer.allocUnsafe(21);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(1, 1);
    b.writeDoubleLE(-123.131515, 5);
    b.writeDoubleLE(49.187253, 13);
    expect(geoJsonPointToLatLon(b)).toEqual(expected);
  });

  it('parses PostGIS EWKB Point with SRID', () => {
    const b = Buffer.allocUnsafe(25);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(0x20000001, 1);
    b.writeUInt32LE(4326, 5);
    b.writeDoubleLE(-123.131515, 9);
    b.writeDoubleLE(49.187253, 17);
    expect(geoJsonPointToLatLon(b)).toEqual(expected);
  });

  it('parses hex-encoded EWKB string', () => {
    const b = Buffer.allocUnsafe(21);
    b.writeUInt8(1, 0);
    b.writeUInt32LE(1, 1);
    b.writeDoubleLE(-123.131515, 5);
    b.writeDoubleLE(49.187253, 13);
    expect(geoJsonPointToLatLon(b.toString('hex'))).toEqual(expected);
  });

  it('parses WKT and EWKT text', () => {
    expect(geoJsonPointToLatLon('POINT (-123.131515 49.187253)')).toEqual(expected);
    expect(geoJsonPointToLatLon('SRID=4326;POINT(-123.131515 49.187253)')).toEqual(expected);
  });

  it('returns null for invalid inputs', () => {
    expect(geoJsonPointToLatLon(null)).toBeNull();
    expect(geoJsonPointToLatLon(undefined)).toBeNull();
    expect(geoJsonPointToLatLon({ type: 'LineString', coordinates: [] })).toBeNull();
    expect(geoJsonPointToLatLon('not a point')).toBeNull();
    expect(geoJsonPointToLatLon(Buffer.alloc(3))).toBeNull();
  });
});
