import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { RedisClientFactory } from '@opden-data-layer/clients';
import {
  downloadSkillsArchive,
  fetchSkillsHeadSha,
  reindexSkills,
  SkillsSourceError,
  validateSkillsRoot,
  type KnowledgeDatabase,
} from '@opden-data-layer/knowledge';
import type { Kysely } from 'kysely';
import { SkillsRefreshService } from './skills-refresh.service';

jest.mock('@opden-data-layer/knowledge', () => {
  const actual = jest.requireActual('@opden-data-layer/knowledge');
  return {
    ...actual,
    fetchSkillsHeadSha: jest.fn(),
    downloadSkillsArchive: jest.fn(),
    validateSkillsRoot: jest.fn(),
    reindexSkills: jest.fn(),
  };
});

const fetchSkillsHeadShaMock = fetchSkillsHeadSha as jest.MockedFunction<
  typeof fetchSkillsHeadSha
>;
const downloadSkillsArchiveMock = downloadSkillsArchive as jest.MockedFunction<
  typeof downloadSkillsArchive
>;
const validateSkillsRootMock = validateSkillsRoot as jest.MockedFunction<
  typeof validateSkillsRoot
>;
const reindexSkillsMock = reindexSkills as jest.MockedFunction<typeof reindexSkills>;

const SHA_OLD = 'a'.repeat(40);
const SHA_NEW = 'b'.repeat(40);

describe('SkillsRefreshService', () => {
  const db = {} as Kysely<KnowledgeDatabase>;
  let redisGet: jest.Mock;
  let redisSet: jest.Mock;
  let redisExpire: jest.Mock;
  let trySetNx: jest.Mock;
  let releaseLock: jest.Mock;
  let service: SkillsRefreshService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisGet = jest.fn();
    redisSet = jest.fn().mockResolvedValue(undefined);
    redisExpire = jest.fn().mockResolvedValue(undefined);
    trySetNx = jest.fn().mockResolvedValue(true);
    releaseLock = jest.fn().mockResolvedValue(true);

    const redisFactory = {
      getClient: () => ({
        get: redisGet,
        set: redisSet,
        expire: redisExpire,
        trySetNx,
        releaseLockIfValue: releaseLock,
      }),
    } as unknown as RedisClientFactory;

    const configGet = jest.fn((key: string, defaultValue?: unknown) => {
      const map: Record<string, unknown> = {
        'knowledge.skillsRemoteEnabled': true,
        'knowledge.skillsRepo': 'Waiviogit/skills',
        'knowledge.skillsBranch': 'master',
        'knowledge.skillsSnapshotDir': '/app/vendor/skills',
        'knowledge.skillsRefreshIntervalSec': 300,
        'knowledge.githubToken': undefined,
      };
      if (key in map) {
        return map[key];
      }
      return defaultValue;
    });
    const config = {
      get: configGet,
      getOrThrow: (key: string) => configGet(key),
    } as unknown as ConfigService;

    const scheduler = {
      addInterval: jest.fn(),
      deleteInterval: jest.fn(),
    } as unknown as SchedulerRegistry;

    service = new SkillsRefreshService(db, config, redisFactory, scheduler);

    reindexSkillsMock.mockResolvedValue({
      indexed: 1,
      skipped: 0,
      deleted: 0,
      chunks: 1,
      durationMs: 5,
    });
  });

  it('refreshIfDue no-ops when sha is unchanged', async () => {
    redisGet.mockResolvedValue(SHA_OLD);
    fetchSkillsHeadShaMock.mockResolvedValue({ status: 'unchanged' });

    await service.refreshIfDue();

    expect(downloadSkillsArchiveMock).not.toHaveBeenCalled();
    expect(reindexSkillsMock).not.toHaveBeenCalled();
    expect(redisExpire).toHaveBeenCalled();
  });

  it('refreshIfDue does not download when sha matches stored with a new etag', async () => {
    redisGet.mockImplementation(async (key: string) => {
      if (String(key).endsWith('sha')) return SHA_OLD;
      return '"old-etag"';
    });
    fetchSkillsHeadShaMock.mockResolvedValue({
      status: 'changed',
      sha: SHA_OLD,
      etag: '"new-etag"',
    });

    await service.refreshIfDue();

    expect(downloadSkillsArchiveMock).not.toHaveBeenCalled();
    expect(reindexSkillsMock).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalled();
  });

  it('refreshIfDue downloads and reindexes on a new sha', async () => {
    redisGet.mockResolvedValue(SHA_OLD);
    fetchSkillsHeadShaMock.mockResolvedValue({
      status: 'changed',
      sha: SHA_NEW,
      etag: '"etag-2"',
    });
    downloadSkillsArchiveMock.mockResolvedValue(undefined);
    validateSkillsRootMock.mockResolvedValue(SHA_NEW);

    await service.refreshIfDue();

    expect(downloadSkillsArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ sha: SHA_NEW }),
    );
    expect(reindexSkillsMock).toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringContaining('skills:sha'),
      SHA_NEW,
      expect.any(Number),
    );
  });

  it('refreshIfDue keeps stored sha when GitHub fails', async () => {
    redisGet.mockResolvedValue(SHA_OLD);
    fetchSkillsHeadShaMock.mockRejectedValue(
      new SkillsSourceError('rate_limit', 'nope', 429),
    );

    await service.refreshIfDue();

    expect(downloadSkillsArchiveMock).not.toHaveBeenCalled();
    expect(reindexSkillsMock).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('refreshIfDue skips when lock is held', async () => {
    trySetNx.mockResolvedValue(false);

    await service.refreshIfDue();

    expect(fetchSkillsHeadShaMock).not.toHaveBeenCalled();
  });

  it('seedFromSnapshot indexes the snapshot and stores sha without network', async () => {
    validateSkillsRootMock.mockResolvedValue(SHA_OLD);

    await service.seedFromSnapshot();

    expect(fetchSkillsHeadShaMock).not.toHaveBeenCalled();
    expect(downloadSkillsArchiveMock).not.toHaveBeenCalled();
    expect(reindexSkillsMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ skillsRoot: '/app/vendor/skills' }),
    );
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringContaining('skills:sha'),
      SHA_OLD,
      expect.any(Number),
    );
  });
});
