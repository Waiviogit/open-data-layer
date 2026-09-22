import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

import {
  buildObjectPostFeedScope,
  parsePinnedPostRefs,
  pinnedRefsToKeys,
  SOCIAL_LINK_BASE,
} from './object-feed-scope.builder';

function baseView(overrides: Partial<ResolvedObjectView> = {}): ResolvedObjectView {
  return {
    object_id: 'obj-1',
    object_type: 'business',
    creator: 'alice',
    weight: 10,
    meta_group_id: null,
    status: 'active',
    canonical: null,
    fields: {},
    ...overrides,
  };
}

describe('buildObjectPostFeedScope', () => {
  it('builds regular scope with linked ids and remove/pin exclusions', () => {
    const view = baseView({
      fields: {
        [UPDATE_TYPES.PIN]: {
          update_type: UPDATE_TYPES.PIN,
          cardinality: 'multi',
          values: [
            {
              update_id: 'p1',
              update_type: UPDATE_TYPES.PIN,
              creator: 'bob',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: 'author1/post1',
              value_geo: null,
              value_json: null,
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: 100,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
        [UPDATE_TYPES.REMOVE]: {
          update_type: UPDATE_TYPES.REMOVE,
          cardinality: 'multi',
          values: [
            {
              update_id: 'r1',
              update_type: UPDATE_TYPES.REMOVE,
              creator: 'bob',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: 'author2/post2',
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
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1', 'obj-2'],
      mutedAuthors: ['muted1'],
      locale: 'en-US',
      viewerAccount: 'bob',
    });

    expect(scope.linkedObjectIds).toEqual(['obj-1', 'obj-2']);
    expect(scope.excludedPostRefs).toEqual(
      expect.arrayContaining([
        { author: 'author1', permlink: 'post1' },
        { author: 'author2', permlink: 'post2' },
      ]),
    );
    expect(scope.pinnedPostRefs).toEqual(['author1/post1']);
    expect(scope.viewerPinnedPostRefs).toEqual(['author1/post1']);
    expect(scope.mutedAuthors).toEqual(['muted1']);
    expect(scope.newsFeedMode).toBe(false);
  });

  it('normalizes hashtag locale to post_languages primary subtag', () => {
    const view = baseView({ object_type: 'hashtag' });
    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });
    expect(scope.languages).toEqual(['en-US', 'en']);
  });

  it('enables news feed mode for newsfeed object type', () => {
    const view = baseView({
      object_type: 'newsfeed',
      fields: {
        [UPDATE_TYPES.NEWS_FEED]: {
          update_type: UPDATE_TYPES.NEWS_FEED,
          cardinality: 'single',
          values: [
            {
              update_id: 'nf1',
              update_type: UPDATE_TYPES.NEWS_FEED,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: null,
              value_geo: null,
              value_json: {
                type_list: ['business'],
                authors: ['bob'],
              },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });

    expect(scope.newsFeedMode).toBe(true);
    expect(scope.newsFilter?.typeList).toEqual(['business']);
    expect(scope.newsFilter?.authors).toEqual(['bob']);
    expect(scope.newsFeedAuthorsOnly).toBe(true);
  });

  it('builds link prefixes for LINK objects from url field', () => {
    const view = baseView({
      object_type: 'link',
      fields: {
        [UPDATE_TYPES.URL]: {
          update_type: UPDATE_TYPES.URL,
          cardinality: 'single',
          values: [
            {
              update_id: 'u1',
              update_type: UPDATE_TYPES.URL,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: 'https://example.com/path*',
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
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });

    expect(scope.linkUrlPrefixes).toEqual(['https://example.com/path']);
  });

  it('maps social link channels to URL prefixes', () => {
    expect(SOCIAL_LINK_BASE.twitter).toBe('https://x.com/');

    const view = baseView({
      fields: {
        [UPDATE_TYPES.LINK]: {
          update_type: UPDATE_TYPES.LINK,
          cardinality: 'multi',
          values: [
            {
              update_id: 'l1',
              update_type: UPDATE_TYPES.LINK,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: null,
              value_geo: null,
              value_json: { type: 'twitter', value: 'waivio' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
            {
              update_id: 'l2',
              update_type: UPDATE_TYPES.LINK,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(2),
              value_text: null,
              value_geo: null,
              value_json: { type: 'facebook', value: '123' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
        [UPDATE_TYPES.WEBSITE]: {
          update_type: UPDATE_TYPES.WEBSITE,
          cardinality: 'multi',
          values: [
            {
              update_id: 'w1',
              update_type: UPDATE_TYPES.WEBSITE,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(3),
              value_text: null,
              value_geo: null,
              value_json: { link: 'https://shop.example.com/*' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
        [UPDATE_TYPES.WALLET_ADDRESS]: {
          update_type: UPDATE_TYPES.WALLET_ADDRESS,
          cardinality: 'multi',
          values: [
            {
              update_id: 'wa1',
              update_type: UPDATE_TYPES.WALLET_ADDRESS,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(4),
              value_text: null,
              value_geo: null,
              value_json: { symbol: 'HIVE', address: 'alice' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
            {
              update_id: 'wa2',
              update_type: UPDATE_TYPES.WALLET_ADDRESS,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(5),
              value_text: null,
              value_geo: null,
              value_json: { symbol: 'WAIV', address: 'ignored' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });

    expect(scope.linkUrlPrefixes).toEqual(
      expect.arrayContaining([
        'https://x.com/waivio',
        'https://www.facebook.com/profile.php?id=123',
        'https://www.facebook.com/123',
        'https://shop.example.com/',
      ]),
    );
    expect(scope.mentionAccounts).toEqual(['alice']);
  });

  it('uses an absolute social link URL as the prefix', () => {
    const view = baseView({
      fields: {
        [UPDATE_TYPES.LINK]: {
          update_type: UPDATE_TYPES.LINK,
          cardinality: 'multi',
          values: [
            {
              update_id: 'l-url',
              update_type: UPDATE_TYPES.LINK,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: null,
              value_geo: null,
              value_json: { type: 'twitter', value: 'https://x.com/waivio' },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });

    expect(scope.linkUrlPrefixes).toEqual(['https://x.com/waivio']);
  });

  it('sets newsFeedAuthorsOnly false when authors list is empty', () => {
    const view = baseView({
      object_type: 'newsfeed',
      fields: {
        [UPDATE_TYPES.NEWS_FEED]: {
          update_type: UPDATE_TYPES.NEWS_FEED,
          cardinality: 'single',
          values: [
            {
              update_id: 'nf1',
              update_type: UPDATE_TYPES.NEWS_FEED,
              creator: 'alice',
              locale: null,
              created_at_unix: 1,
              event_seq: BigInt(1),
              value_text: null,
              value_geo: null,
              value_json: { type_list: ['business'] },
              validity_status: 'VALID',
              validity_tier: 'baseline',
              decisive_vote_event_seq: null,
              approve_percent: 100,
              field_weight: null,
              rank_score: null,
              rank_context: null,
              rank_decisive_event_seq: null,
            },
          ],
        },
      },
    });

    const scope = buildObjectPostFeedScope({
      view,
      linkedObjectIds: ['obj-1'],
      mutedAuthors: [],
      locale: 'en-US',
    });

    expect(scope.newsFeedAuthorsOnly).toBe(false);
  });

  it('parses pinned refs and drops invalid entries', () => {
    expect(parsePinnedPostRefs(['alice/post-1', 'bad', 'bob/post-2'])).toEqual([
      { author: 'alice', permlink: 'post-1' },
      { author: 'bob', permlink: 'post-2' },
    ]);
    expect(pinnedRefsToKeys(parsePinnedPostRefs(['alice/post-1']))).toEqual([
      { author: 'alice', permlink: 'post-1' },
    ]);
  });
});
