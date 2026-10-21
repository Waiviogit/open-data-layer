import { DEFAULT_GOVERNANCE_SNAPSHOT, ObjectViewService } from '@opden-data-layer/objects-domain';
import { ConfigService } from '@nestjs/config';
import { AggregatedObjectRepository, ObjectFavoriteRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { ListItemsRecursiveCountService } from '../object-projection/list-items-recursive-count.service';
import { NESTED_OBJECT_UPDATE_TYPES } from './nested-object.constants';
import { GetNestedObjectsEndpoint } from './get-nested-objects.endpoint';

jest.mock('../object-projection/object-ref-expansion', () => ({
  expandObjectRefs: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('../object-projection/project-object', () => ({
  collectObjectRefIdsFromView: jest.fn().mockReturnValue([]),
  projectObjectCore: jest.fn().mockImplementation(({ view }: { view: { object_id: string; object_type: string } }) => ({
    object_id: view.object_id,
    object_type: view.object_type,
    fields: {},
  })),
}));

function createEndpoint(viewService: ObjectViewService) {
  const aggregatedObjectRepo = {
    loadByObjectIds: jest.fn().mockResolvedValue({
      objects: [
        {
          core: { object_id: 'o1', object_type: 'list', status: 'active' },
          updates: [],
        },
      ],
      voterWaivPowers: new Map(),
    }),
  } as unknown as AggregatedObjectRepository;

  const governanceResolver = {
    resolveMergedForObjectView: jest.fn().mockResolvedValue(DEFAULT_GOVERNANCE_SNAPSHOT),
  } as unknown as GovernanceResolverService;

  const objectFavoriteRepo = {
    findFavoriteObjectIdsForAccount: jest.fn(),
  } as unknown as ObjectFavoriteRepository;

  const listItemsRecursiveCountService = {} as unknown as ListItemsRecursiveCountService;

  const config = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  return new GetNestedObjectsEndpoint(
    aggregatedObjectRepo,
    viewService,
    governanceResolver,
    objectFavoriteRepo,
    listItemsRecursiveCountService,
    config,
    { enrich: jest.fn() } as never,
  );
}

describe('GetNestedObjectsEndpoint', () => {
  it('uses nested defaults when updateTypes is omitted', async () => {
    const viewService = {
      resolve: jest.fn().mockReturnValue([
        {
          object_id: 'o1',
          object_type: 'list',
          creator: 'c',
          weight: null,
          meta_group_id: null,
          canonical: null,
          fields: {},
        },
      ]),
    } as unknown as ObjectViewService;

    const endpoint = createEndpoint(viewService);
    await endpoint.execute({ ids: ['o1'], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        update_types: [...NESTED_OBJECT_UPDATE_TYPES],
      }),
    );
  });

  it('uses nested defaults when updateTypes is empty', async () => {
    const viewService = {
      resolve: jest.fn().mockReturnValue([
        {
          object_id: 'o1',
          object_type: 'list',
          creator: 'c',
          weight: null,
          meta_group_id: null,
          canonical: null,
          fields: {},
        },
      ]),
    } as unknown as ObjectViewService;

    const endpoint = createEndpoint(viewService);
    await endpoint.execute({ ids: ['o1'], updateTypes: [], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        update_types: [...NESTED_OBJECT_UPDATE_TYPES],
      }),
    );
  });

  it('passes custom updateTypes to resolve', async () => {
    const viewService = {
      resolve: jest.fn().mockReturnValue([
        {
          object_id: 'o1',
          object_type: 'list',
          creator: 'c',
          weight: null,
          meta_group_id: null,
          canonical: null,
          fields: {},
        },
      ]),
    } as unknown as ObjectViewService;

    const endpoint = createEndpoint(viewService);
    await endpoint.execute({ ids: ['o1'], updateTypes: ['name'], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        update_types: ['name'],
      }),
    );
  });
});
