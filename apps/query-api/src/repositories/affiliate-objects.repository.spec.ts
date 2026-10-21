import { AffiliateObjectsRepository } from './affiliate-objects.repository';

describe('AffiliateObjectsRepository', () => {
  it('returns [] for an empty authority list without querying', async () => {
    const execute = jest.fn();
    const repo = new AffiliateObjectsRepository({
      selectFrom: execute,
    } as never);
    await expect(repo.findObjectIdsForAuthorities([])).resolves.toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns [] for an empty personal creator', async () => {
    const execute = jest.fn();
    const repo = new AffiliateObjectsRepository({
      selectFrom: execute,
    } as never);
    await expect(repo.findPersonalObjectIdsForCreator('')).resolves.toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns null and logs when a read throws', async () => {
    const repo = new AffiliateObjectsRepository({
      selectFrom: jest.fn().mockImplementation(() => {
        throw new Error('db down');
      }),
    } as never);
    const error = jest.spyOn(repo['logger'], 'error').mockImplementation();
    await expect(repo.findAllActiveAffiliateObjectIds()).resolves.toBeNull();
    expect(error).toHaveBeenCalledWith('db down');
    error.mockRestore();
  });
});
