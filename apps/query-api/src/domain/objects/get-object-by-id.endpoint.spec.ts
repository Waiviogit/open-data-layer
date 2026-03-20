import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';

describe('GetObjectByIdEndpoint', () => {
  it('returns null when repository returns no object', async () => {
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [],
        voterReputations: new Map(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn(),
    } as unknown as ObjectViewService;

    const endpoint = new GetObjectByIdEndpoint(repo, viewService);
    const result = await endpoint.execute({
      objectId: 'missing',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(result).toBeNull();
    expect(viewService.resolve).not.toHaveBeenCalled();
  });

  it('returns resolved view when object exists', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [],
            validity_votes: [],
            rank_votes: [],
            authorities: [],
          },
        ],
        voterReputations: new Map(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;

    const endpoint = new GetObjectByIdEndpoint(repo, viewService);
    const result = await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
      includeRejected: true,
    });

    expect(result).toEqual(mockView);
    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: ['name'],
        locale: 'en-US',
        include_rejected: true,
      }),
    );
  });
});
