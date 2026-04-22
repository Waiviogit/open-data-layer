import type { GovernanceSnapshot, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { DEFAULT_GOVERNANCE_SNAPSHOT, ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';

function createEndpointDeps(overrides?: {
  resolveMerged?: GovernanceSnapshot;
}) {
  const governanceResolver = {
    resolveMergedForObjectView: jest.fn().mockImplementation(() =>
      Promise.resolve(overrides?.resolveMerged ?? DEFAULT_GOVERNANCE_SNAPSHOT),
    ),
  } as unknown as GovernanceResolverService;
  return { governanceResolver };
}

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
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(repo, viewService, governanceResolver);
    const result = await endpoint.execute({
      objectId: 'missing',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(result).toBeNull();
    expect(viewService.resolve).not.toHaveBeenCalled();
    expect(governanceResolver.resolveMergedForObjectView).not.toHaveBeenCalled();
  });

  it('returns resolved view when object exists', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
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
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(repo, viewService, governanceResolver);
    const result = await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
      includeRejected: true,
    });

    expect(result).toEqual(mockView);
    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith(undefined);
    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: ['name'],
        locale: 'en-US',
        include_rejected: true,
        governance: DEFAULT_GOVERNANCE_SNAPSHOT,
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
      canonical: null,
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
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(repo, viewService, governanceResolver);
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
        governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      }),
    );
    const call = (viewService.resolve as jest.Mock).mock.calls[0];
    expect(call[2].update_types).toHaveLength(2);
  });

  it('uses governance from resolveMergedForObjectView when platform governance is configured', async () => {
    const customGovernance = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      admins: ['admin-from-gov'],
    };
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
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
    const { governanceResolver } = createEndpointDeps({
      resolveMerged: customGovernance,
    });

    const endpoint = new GetObjectByIdEndpoint(repo, viewService, governanceResolver);
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith(undefined);
    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        governance: customGovernance,
      }),
    );
  });

  it('passes header governance id to resolveMergedForObjectView', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
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
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(repo, viewService, governanceResolver);
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
      governanceObjectIdFromHeader: 'hdr-gov',
    });

    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith('hdr-gov');
  });
});
