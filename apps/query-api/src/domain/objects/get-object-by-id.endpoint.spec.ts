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

  it('when updateTypes is empty, resolves all distinct update types from aggregated updates', async () => {
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
            updates: [
              {
                update_id: 'u1',
                object_id: 'o1',
                update_type: 'title',
                creator: 'c',
                event_seq: BigInt(1),
                locale: null,
                created_at_unix: 0,
                value_text: null,
                value_json: null,
              },
              {
                update_id: 'u2',
                object_id: 'o1',
                update_type: 'description',
                creator: 'c',
                event_seq: BigInt(2),
                locale: null,
                created_at_unix: 0,
                value_text: null,
                value_json: null,
              },
            ],
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
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: [],
      locale: 'en-US',
    });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: expect.arrayContaining(['title', 'description']),
      }),
    );
    const call = (viewService.resolve as jest.Mock).mock.calls[0];
    expect(call[2].update_types).toHaveLength(2);
  });
});
