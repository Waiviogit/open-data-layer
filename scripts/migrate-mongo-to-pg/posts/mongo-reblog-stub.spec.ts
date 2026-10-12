import type { NewPostRebloggedUser } from '@opden-data-layer/odl-db-types';

import {
  dedupeReblogsLastWins,
  isMongoReblogStub,
  mongoReblogPostKey,
  partitionStubsByExistingPosts,
  reblogFromMongoStub,
} from './mongo-reblog-stub';
import type { MongoPost } from './types';

const GRAMPO_STUB: MongoPost = {
  author: 'grampo',
  permlink: 'cryptodive/your-shop-on-waivio',
  title: '',
  body: '',
  reblog_to: {
    author: 'cryptodive',
    permlink: 'your-shop-on-waivio',
  },
  createdAt: '2023-10-16T21:50:08.449Z',
  updatedAt: '2024-07-11T00:34:55.305Z',
};

describe('isMongoReblogStub', () => {
  it('detects empty title/body with reblog_to', () => {
    expect(isMongoReblogStub(GRAMPO_STUB)).toBe(true);
  });

  it('is not a stub when title and body are empty without reblog_to', () => {
    expect(
      isMongoReblogStub({
        author: 'grampo',
        permlink: 'draft',
        title: '',
        body: '',
      }),
    ).toBe(false);
  });

  it('is not a stub when reblog_to is present but the post has a body', () => {
    expect(
      isMongoReblogStub({
        ...GRAMPO_STUB,
        title: 'Shop',
        body: 'content',
      }),
    ).toBe(false);
  });
});

describe('reblogFromMongoStub', () => {
  it('maps the Waivio stub to source post + reblogger with createdAt, not updatedAt', () => {
    expect(reblogFromMongoStub(GRAMPO_STUB)).toEqual({
      author: 'cryptodive',
      permlink: 'your-shop-on-waivio',
      account: 'grampo',
      reblogged_at_unix: 1_697_493_008,
    });
  });

  it('parses extended-JSON createdAt', () => {
    expect(
      reblogFromMongoStub({
        ...GRAMPO_STUB,
        createdAt: { $date: '2023-10-16T21:50:08.449Z' },
      })?.reblogged_at_unix,
    ).toBe(1_697_493_008);
  });

  it('falls back to ObjectId seconds when createdAt is missing', () => {
    const { createdAt: _c, updatedAt: _u, ...rest } = GRAMPO_STUB;
    expect(
      reblogFromMongoStub({
        ...rest,
        _id: '652db010d1873fdc336a7aa3',
      })?.reblogged_at_unix,
    ).toBe(Number.parseInt('652db010', 16));
  });

  it('ignores updatedAt when createdAt is missing and ObjectId is absent', () => {
    const { createdAt: _c, ...rest } = GRAMPO_STUB;
    expect(reblogFromMongoStub(rest)).toBeNull();
  });

  it('skips guest rebloggers', () => {
    expect(
      reblogFromMongoStub({
        ...GRAMPO_STUB,
        author: 'waivio_guest',
      }),
    ).toBeNull();
  });

  it('skips self-reblogs', () => {
    expect(
      reblogFromMongoStub({
        ...GRAMPO_STUB,
        author: 'cryptodive',
        reblog_to: {
          author: 'cryptodive',
          permlink: 'your-shop-on-waivio',
        },
      }),
    ).toBeNull();
  });
});

describe('partitionStubsByExistingPosts', () => {
  const stub: NewPostRebloggedUser = {
    author: 'cryptodive',
    permlink: 'your-shop-on-waivio',
    account: 'grampo',
    reblogged_at_unix: 1_697_493_008,
  };

  it('keeps stubs pending when the source post is not in the existing-key set', () => {
    const { ready, pending } = partitionStubsByExistingPosts(
      [stub],
      new Set(),
    );
    expect(ready).toEqual([]);
    expect(pending).toEqual([stub]);
  });

  it('marks stubs ready only when the source key exists', () => {
    const { ready, pending } = partitionStubsByExistingPosts(
      [stub],
      new Set([mongoReblogPostKey('cryptodive', 'your-shop-on-waivio')]),
    );
    expect(ready).toEqual([stub]);
    expect(pending).toEqual([]);
  });
});

describe('dedupeReblogsLastWins', () => {
  it('keeps the last unix for the same PK', () => {
    const rows: NewPostRebloggedUser[] = [
      {
        author: 'cryptodive',
        permlink: 'p',
        account: 'grampo',
        reblogged_at_unix: 1,
      },
      {
        author: 'cryptodive',
        permlink: 'p',
        account: 'grampo',
        reblogged_at_unix: 2,
      },
    ];
    expect(dedupeReblogsLastWins(rows)).toEqual([rows[1]]);
  });
});
