import { GetDiscoverObjectsEndpoint, parseTagFilters } from './get-discover-objects.endpoint';
import type { DiscoverRepository } from '../../repositories/discover.repository';
import type { AggregatedObjectRepository } from '../../repositories/aggregated-object.repository';
import type { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { GovernanceResolverService } from '../governance/governance-resolver.service';
import type { ObjectProjectionService } from '../object-projection/object-projection.service';

describe('parseTagFilters', () => {
  it('parses category:value and skips legacy value-only', () => {
    expect(parseTagFilters(['Cuisine:asian', 'asian', 'Meal Type:breakfast'])).toEqual([
      { category: 'Cuisine', value: 'asian' },
      { category: 'Meal Type', value: 'breakfast' },
    ]);
  });
});

describe('GetDiscoverObjectsEndpoint', () => {
  it('returns empty list when repository has no rows', async () => {
    const discoverRepo = {
      listObjects: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
      buildObjectCursor: jest.fn(),
    } as unknown as DiscoverRepository;

    const endpoint = new GetDiscoverObjectsEndpoint(
      discoverRepo,
      {} as AggregatedObjectRepository,
      {} as ObjectViewService,
      {} as GovernanceResolverService,
      {} as ObjectProjectionService,
    );

    const result = await endpoint.execute({
      query: { tags: [], sort: 'newest', limit: 20 },
      locale: 'en-US',
    });

    expect(result).toEqual({ items: [], cursor: null, hasMore: false });
    expect(discoverRepo.listObjects).toHaveBeenCalled();
  });

  it('passes parsed category:value tags to repository', async () => {
    const discoverRepo = {
      listObjects: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
      buildObjectCursor: jest.fn(),
    } as unknown as DiscoverRepository;

    const endpoint = new GetDiscoverObjectsEndpoint(
      discoverRepo,
      {} as AggregatedObjectRepository,
      {} as ObjectViewService,
      {} as GovernanceResolverService,
      {} as ObjectProjectionService,
    );

    await endpoint.execute({
      query: { tags: ['Cuisine:asian'], sort: 'newest', limit: 20 },
      locale: 'en-US',
    });

    expect(discoverRepo.listObjects).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [{ category: 'Cuisine', value: 'asian' }],
      }),
    );
  });
});
