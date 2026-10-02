import { UPDATE_TYPES } from '@opden-data-layer/core';
import { resolveObjectRefIds } from './resolve-object-ref-ids';

describe('resolveObjectRefIds', () => {
  const repo = {
    findMetaGroupIdsByObjectIds: jest.fn().mockResolvedValue([]),
    findCategoryNamesByObjectId: jest.fn().mockResolvedValue(['Coffee']),
    findRelatedBackfillObjectIds: jest.fn().mockResolvedValue(['cat-a', 'cat-b']),
    findSimilarBackfillObjectIds: jest.fn(),
    findReverseAddOnObjectIds: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns explicit refs first, then category backfill for related', async () => {
    const result = await resolveObjectRefIds({
      sourceId: 'host',
      updateType: UPDATE_TYPES.IS_RELATED_TO,
      explicitRefIds: ['explicit-1'],
      skip: 0,
      limit: 2,
      repo: repo as never,
    });

    expect(result.pageIds).toEqual(['explicit-1', 'cat-a']);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('2');
    expect(repo.findRelatedBackfillObjectIds).toHaveBeenCalled();
  });

  it('pages category backfill after explicit refs are exhausted', async () => {
    const result = await resolveObjectRefIds({
      sourceId: 'host',
      updateType: UPDATE_TYPES.IS_RELATED_TO,
      explicitRefIds: ['explicit-1', 'explicit-2'],
      skip: 2,
      limit: 2,
      repo: repo as never,
    });

    expect(result.pageIds).toEqual(['cat-a', 'cat-b']);
    expect(repo.findRelatedBackfillObjectIds).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, limit: 3 }),
    );
  });

  it('uses similar backfill instead of related backfill', async () => {
    repo.findSimilarBackfillObjectIds.mockResolvedValueOnce(['sim-a']);
    const result = await resolveObjectRefIds({
      sourceId: 'host',
      updateType: UPDATE_TYPES.IS_SIMILAR_TO,
      explicitRefIds: [],
      skip: 0,
      limit: 5,
      repo: repo as never,
    });

    expect(result.pageIds).toEqual(['sim-a']);
    expect(repo.findSimilarBackfillObjectIds).toHaveBeenCalled();
    expect(repo.findRelatedBackfillObjectIds).not.toHaveBeenCalled();
  });

  it('looks up meta groups for the source object and explicit refs', async () => {
    repo.findMetaGroupIdsByObjectIds.mockResolvedValueOnce(['host-group', 'explicit-group']);

    await resolveObjectRefIds({
      sourceId: 'host',
      updateType: UPDATE_TYPES.IS_RELATED_TO,
      explicitRefIds: ['explicit-1'],
      skip: 0,
      limit: 2,
      repo: repo as never,
    });

    expect(repo.findMetaGroupIdsByObjectIds).toHaveBeenCalledWith(['host', 'explicit-1']);
    expect(repo.findRelatedBackfillObjectIds).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeMetaGroupIds: ['host-group', 'explicit-group'],
      }),
    );
  });

  it('excludes the source meta_group_id from similar backfill when there are no explicit refs', async () => {
    repo.findMetaGroupIdsByObjectIds.mockResolvedValueOnce(['noresti-wrench']);
    repo.findSimilarBackfillObjectIds.mockResolvedValueOnce(['other-product']);

    const result = await resolveObjectRefIds({
      sourceId: 'wrench-a',
      updateType: UPDATE_TYPES.IS_SIMILAR_TO,
      explicitRefIds: [],
      skip: 0,
      limit: 5,
      repo: repo as never,
    });

    expect(result.pageIds).toEqual(['other-product']);
    expect(repo.findMetaGroupIdsByObjectIds).toHaveBeenCalledWith(['wrench-a']);
    expect(repo.findSimilarBackfillObjectIds).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'wrench-a',
        excludeMetaGroupIds: ['noresti-wrench'],
      }),
    );
  });

  it('uses reverse add-on lookup when explicit refs are absent', async () => {
    repo.findReverseAddOnObjectIds.mockResolvedValueOnce(['addon-1']);
    const result = await resolveObjectRefIds({
      sourceId: 'host',
      updateType: UPDATE_TYPES.ADD_ON,
      explicitRefIds: [],
      skip: 0,
      limit: 5,
      repo: repo as never,
    });

    expect(result.pageIds).toEqual(['addon-1']);
    expect(repo.findReverseAddOnObjectIds).toHaveBeenCalled();
    expect(repo.findRelatedBackfillObjectIds).not.toHaveBeenCalled();
  });
});
