import { ConfigService } from '@nestjs/config';
import { DEFAULT_GOVERNANCE_SNAPSHOT, ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, SocialGraphRepository } from '../../repositories';
import { GovernanceResolverService } from './governance-resolver.service';

describe('GovernanceResolverService.resolveMergedForObjectView', () => {
  function createService(configGet: Record<string, string>) {
    const config = {
      get: jest.fn((key: string) => configGet[key] ?? ''),
    } as unknown as ConfigService;
    const mutesRepo = {
      listMutedForMuters: jest.fn().mockResolvedValue([]),
    } as unknown as SocialGraphRepository;
    const service = new GovernanceResolverService(
      {} as AggregatedObjectRepository,
      {} as ObjectViewService,
      config,
      mutesRepo,
    );
    return { service, config };
  }

  it('returns DEFAULT without calling resolve when config id and header are empty', async () => {
    const { service } = createService({});
    const resolveSpy = jest.spyOn(service, 'resolve').mockResolvedValue(DEFAULT_GOVERNANCE_SNAPSHOT);

    const result = await service.resolveMergedForObjectView(undefined);

    expect(result).toEqual(DEFAULT_GOVERNANCE_SNAPSHOT);
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it('resolves config id only when header is absent', async () => {
    const custom = { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['p'] };
    const { service } = createService({ 'governance.objectId': 'gov-cfg' });
    const resolveSpy = jest.spyOn(service, 'resolve').mockResolvedValue(custom);

    const result = await service.resolveMergedForObjectView(undefined);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(resolveSpy).toHaveBeenCalledWith('gov-cfg');
    expect(result).toEqual(custom);
  });

  it('merges header and config snapshots when both ids are set', async () => {
    const { service } = createService({ 'governance.objectId': 'gov-cfg' });
    const resolveSpy = jest.spyOn(service, 'resolve').mockImplementation(async (id: string) => {
      if (id === 'gov-cfg') {
        return { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['base'] };
      }
      if (id === 'gov-hdr') {
        return { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['hdr'] };
      }
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    });

    const result = await service.resolveMergedForObjectView('gov-hdr');

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy).toHaveBeenCalledWith('gov-cfg');
    expect(resolveSpy).toHaveBeenCalledWith('gov-hdr');
    expect(result.admins).toEqual(['base', 'hdr']);
  });
});
