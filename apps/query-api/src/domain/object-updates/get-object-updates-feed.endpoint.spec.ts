import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';

import { GetObjectUpdatesFeedEndpoint } from './get-object-updates-feed.endpoint';

describe('GetObjectUpdatesFeedEndpoint.executeByUpdateId', () => {
  const objectsCore = {
    findByObjectIdForPage: jest.fn(),
  };
  const updatesFeedRepo = {
    findJoinRowByObjectAndUpdateId: jest.fn(),
    findValidityVotesForObjectAndUpdates: jest.fn(),
    findWaivPowersByAccounts: jest.fn(),
    findRankVoteProjectionForUpdates: jest.fn(),
  };
  const objectOwnershipRepo = {
    findByObjectId: jest.fn(),
  };
  const governanceResolver = {
    resolveMergedForObjectView: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  const endpoint = new GetObjectUpdatesFeedEndpoint(
    objectsCore as never,
    updatesFeedRepo as never,
    objectOwnershipRepo as never,
    governanceResolver as never,
    config as never,
  );

  const joinRow = {
    row: {
      update_id: 'u1',
      object_id: 'obj1',
      update_type: 'name',
      creator: 'alice',
      locale: null,
      created_at_unix: 100,
      value_text: 'Shop',
      value_json: null,
      value_geo: null,
      rank_score: null,
      rank_context: null,
      rank_decisive_event_seq: null,
      search_vector: null,
      value_text_normalized: null,
      transaction_id: 'tx1',
      event_seq: BigInt(1),
    },
    creator_wobjects_weight: 10,
    geo_lat: null,
    geo_lon: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    governanceResolver.resolveMergedForObjectView.mockResolvedValue(
      DEFAULT_GOVERNANCE_SNAPSHOT,
    );
    objectOwnershipRepo.findByObjectId.mockResolvedValue([]);
    updatesFeedRepo.findValidityVotesForObjectAndUpdates.mockResolvedValue([]);
    updatesFeedRepo.findWaivPowersByAccounts.mockResolvedValue(new Map());
    updatesFeedRepo.findRankVoteProjectionForUpdates.mockResolvedValue({
      countByUpdateId: new Map(),
      viewerRankByUpdateId: new Map(),
    });
    config.get.mockReturnValue(undefined);
  });

  it('returns null when object does not exist', async () => {
    objectsCore.findByObjectIdForPage.mockResolvedValue(null);

    await expect(
      endpoint.executeByUpdateId({ objectId: 'obj1', updateId: 'u1' }),
    ).resolves.toBeNull();
  });

  it('returns null when update does not exist for object', async () => {
    objectsCore.findByObjectIdForPage.mockResolvedValue({ object_id: 'obj1' });
    updatesFeedRepo.findJoinRowByObjectAndUpdateId.mockResolvedValue(null);

    await expect(
      endpoint.executeByUpdateId({ objectId: 'obj1', updateId: 'missing' }),
    ).resolves.toBeNull();
  });

  it('returns feed item dto when update exists', async () => {
    objectsCore.findByObjectIdForPage.mockResolvedValue({ object_id: 'obj1' });
    updatesFeedRepo.findJoinRowByObjectAndUpdateId.mockResolvedValue(joinRow);

    const result = await endpoint.executeByUpdateId({
      objectId: 'obj1',
      updateId: 'u1',
    });

    expect(result).toMatchObject({
      update_id: 'u1',
      object_id: 'obj1',
      update_type: 'name',
      creator: 'alice',
      value_text: 'Shop',
      transaction_id: 'tx1',
      rank_score: null,
      viewer_rank: null,
    });
    expect(updatesFeedRepo.findJoinRowByObjectAndUpdateId).toHaveBeenCalledWith(
      'obj1',
      'u1',
    );
  });

  it('maps rank_score and viewer_rank from projection', async () => {
    objectsCore.findByObjectIdForPage.mockResolvedValue({ object_id: 'obj1' });
    updatesFeedRepo.findJoinRowByObjectAndUpdateId.mockResolvedValue({
      ...joinRow,
      row: { ...joinRow.row, update_id: 'g1', update_type: 'imageGalleryItem', rank_score: 7500 },
    });
    updatesFeedRepo.findRankVoteProjectionForUpdates.mockResolvedValue({
      countByUpdateId: new Map([['g1', 2]]),
      viewerRankByUpdateId: new Map([['g1', 8000]]),
    });

    const result = await endpoint.executeByUpdateId({
      objectId: 'obj1',
      updateId: 'g1',
      viewerAccount: 'bob',
    });

    expect(updatesFeedRepo.findRankVoteProjectionForUpdates).toHaveBeenCalledWith(
      'obj1',
      ['g1'],
      'bob',
    );
    expect(result).toMatchObject({
      rank_score: 7500,
      viewer_rank: 8000,
    });
  });
});

describe('GetObjectUpdatesFeedEndpoint.execute recency', () => {
  const objectsCore = { findByObjectIdForPage: jest.fn() };
  const updatesFeedRepo = {
    findRecencyPage: jest.fn(),
    findValidityVotesForObjectAndUpdates: jest.fn(),
    findWaivPowersByAccounts: jest.fn(),
    findRankVoteProjectionForUpdates: jest.fn(),
  };
  const objectOwnershipRepo = { findByObjectId: jest.fn() };
  const governanceResolver = { resolveMergedForObjectView: jest.fn() };
  const config = { get: jest.fn() };

  const endpoint = new GetObjectUpdatesFeedEndpoint(
    objectsCore as never,
    updatesFeedRepo as never,
    objectOwnershipRepo as never,
    governanceResolver as never,
    config as never,
  );

  const joinRow = {
    row: {
      update_id: 'g1',
      object_id: 'obj1',
      update_type: 'imageGalleryItem',
      creator: 'alice',
      locale: null,
      created_at_unix: 100,
      value_text: null,
      value_json: { album: 'Photos', url: 'https://example.com/a.jpg' },
      value_geo: null,
      rank_score: 6000,
      rank_context: null,
      rank_decisive_event_seq: null,
      search_vector: null,
      value_text_normalized: null,
      transaction_id: 'tx1',
      event_seq: BigInt(1),
    },
    creator_wobjects_weight: 10,
    geo_lat: null,
    geo_lon: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    objectsCore.findByObjectIdForPage.mockResolvedValue({ object_id: 'obj1' });
    governanceResolver.resolveMergedForObjectView.mockResolvedValue(
      DEFAULT_GOVERNANCE_SNAPSHOT,
    );
    objectOwnershipRepo.findByObjectId.mockResolvedValue([]);
    updatesFeedRepo.findRecencyPage.mockResolvedValue([joinRow]);
    updatesFeedRepo.findValidityVotesForObjectAndUpdates.mockResolvedValue([]);
    updatesFeedRepo.findWaivPowersByAccounts.mockResolvedValue(new Map());
    updatesFeedRepo.findRankVoteProjectionForUpdates.mockResolvedValue({
      countByUpdateId: new Map([['g1', 1]]),
      viewerRankByUpdateId: new Map([['g1', 7000]]),
    });
    config.get.mockReturnValue(undefined);
  });

  it('loads rank projection for recency page items', async () => {
    const result = await endpoint.execute({
      objectId: 'obj1',
      query: { sort: 'recency', limit: 20 },
      viewerAccount: 'bob',
    });

    expect(updatesFeedRepo.findRankVoteProjectionForUpdates).toHaveBeenCalledWith(
      'obj1',
      ['g1'],
      'bob',
    );
    expect(result?.items[0]).toMatchObject({
      transaction_id: 'tx1',
      rank_score: 6000,
      viewer_rank: 7000,
    });
  });
});

describe('GetObjectUpdatesFeedEndpoint.execute approval', () => {
  const objectsCore = { findByObjectIdForPage: jest.fn() };
  const updatesFeedRepo = {
    findAllForApprovalSort: jest.fn(),
    findValidityVotesForObjectAndUpdates: jest.fn(),
    findWaivPowersByAccounts: jest.fn(),
    findRankVoteProjectionForUpdates: jest.fn(),
  };
  const objectOwnershipRepo = { findByObjectId: jest.fn() };
  const governanceResolver = { resolveMergedForObjectView: jest.fn() };
  const config = { get: jest.fn() };

  const endpoint = new GetObjectUpdatesFeedEndpoint(
    objectsCore as never,
    updatesFeedRepo as never,
    objectOwnershipRepo as never,
    governanceResolver as never,
    config as never,
  );

  const joinRow = {
    row: {
      update_id: 'g2',
      object_id: 'obj1',
      update_type: 'imageGalleryItem',
      creator: 'alice',
      locale: null,
      created_at_unix: 100,
      value_text: null,
      value_json: { album: 'Photos', url: 'https://example.com/b.jpg' },
      value_geo: null,
      rank_score: 5000,
      rank_context: null,
      rank_decisive_event_seq: null,
      search_vector: null,
      value_text_normalized: null,
      transaction_id: 'tx2',
      event_seq: BigInt(2),
    },
    creator_wobjects_weight: 10,
    geo_lat: null,
    geo_lon: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    objectsCore.findByObjectIdForPage.mockResolvedValue({ object_id: 'obj1' });
    governanceResolver.resolveMergedForObjectView.mockResolvedValue(
      DEFAULT_GOVERNANCE_SNAPSHOT,
    );
    objectOwnershipRepo.findByObjectId.mockResolvedValue([]);
    updatesFeedRepo.findAllForApprovalSort.mockResolvedValue([joinRow]);
    updatesFeedRepo.findValidityVotesForObjectAndUpdates.mockResolvedValue([]);
    updatesFeedRepo.findWaivPowersByAccounts.mockResolvedValue(new Map());
    updatesFeedRepo.findRankVoteProjectionForUpdates.mockResolvedValue({
      countByUpdateId: new Map([['g2', 4]]),
      viewerRankByUpdateId: new Map([['g2', 9000]]),
    });
    config.get.mockReturnValue(undefined);
  });

  it('loads rank projection for approval sort items', async () => {
    const result = await endpoint.execute({
      objectId: 'obj1',
      query: { sort: 'approval', limit: 20 },
      viewerAccount: 'carol',
    });

    expect(updatesFeedRepo.findRankVoteProjectionForUpdates).toHaveBeenCalledWith(
      'obj1',
      ['g2'],
      'carol',
    );
    expect(result?.items[0]).toMatchObject({
      transaction_id: 'tx2',
      rank_score: 5000,
      viewer_rank: 9000,
    });
  });
});
