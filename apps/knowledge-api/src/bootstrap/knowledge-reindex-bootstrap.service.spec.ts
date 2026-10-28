import { ConfigService } from '@nestjs/config';
import type { RedisClientFactory } from '@opden-data-layer/clients';
import {
  KnowledgeRepository,
  reparseSkillsFromStoredBodies,
  runKnowledgeReindex,
  type KnowledgeDatabase,
} from '@opden-data-layer/knowledge';
import type { Kysely } from 'kysely';
import { KnowledgeReindexBootstrapService } from './knowledge-reindex-bootstrap.service';
import { SkillsRefreshService } from './skills-refresh.service';

jest.mock('@opden-data-layer/knowledge', () => {
  const actual = jest.requireActual('@opden-data-layer/knowledge');
  return {
    ...actual,
    runKnowledgeReindex: jest.fn(),
    reparseSkillsFromStoredBodies: jest.fn(),
    KnowledgeRepository: jest.fn(),
  };
});

const runKnowledgeReindexMock = runKnowledgeReindex as jest.MockedFunction<
  typeof runKnowledgeReindex
>;
const KnowledgeRepositoryMock = KnowledgeRepository as jest.MockedClass<
  typeof KnowledgeRepository
>;
const reparseSkillsFromStoredBodiesMock =
  reparseSkillsFromStoredBodies as jest.MockedFunction<
    typeof reparseSkillsFromStoredBodies
  >;

describe('KnowledgeReindexBootstrapService', () => {
  const db = {} as Kysely<KnowledgeDatabase>;
  let countFiles: jest.Mock;
  let listPaths: jest.Mock;
  let redisGet: jest.Mock;
  let redisSet: jest.Mock;
  let trySetNx: jest.Mock;
  let releaseLock: jest.Mock;
  let configGet: jest.Mock;
  let seedFromSnapshot: jest.Mock;
  let service: KnowledgeReindexBootstrapService;

  beforeEach(() => {
    jest.clearAllMocks();
    countFiles = jest.fn();
    listPaths = jest.fn().mockResolvedValue(['odl/knowledge-api-routing/SKILL.md']);
    seedFromSnapshot = jest.fn().mockResolvedValue(undefined);
    KnowledgeRepositoryMock.mockImplementation(
      () =>
        ({
          countFiles,
          listPaths,
        }) as unknown as KnowledgeRepository,
    );
    reparseSkillsFromStoredBodiesMock.mockResolvedValue({
      indexed: 0,
      skipped: 1,
      deleted: 0,
      chunks: 0,
      durationMs: 1,
    });

    redisGet = jest.fn().mockResolvedValue(null);
    redisSet = jest.fn().mockResolvedValue(undefined);
    trySetNx = jest.fn().mockResolvedValue(true);
    releaseLock = jest.fn().mockResolvedValue(true);

    const redisFactory = {
      getClient: () => ({
        get: redisGet,
        set: redisSet,
        trySetNx,
        releaseLockIfValue: releaseLock,
      }),
    } as unknown as RedisClientFactory;

    configGet = jest.fn((key: string, defaultValue?: unknown) => {
      const map: Record<string, unknown> = {
        'knowledge.startupReindex': true,
        'knowledge.workspaceRoot': '/app',
        'knowledge.writeAgentRoutes': false,
        'knowledge.reindexMinIntervalSec': 300,
        'knowledge.reindexLockTtlSec': 600,
      };
      if (key in map) {
        return map[key];
      }
      return defaultValue;
    });

    const config = { get: configGet, getOrThrow: (key: string) => configGet(key) } as unknown as ConfigService;

    const skillsRefresh = {
      seedFromSnapshot,
    } as unknown as SkillsRefreshService;

    service = new KnowledgeReindexBootstrapService(
      db,
      config,
      redisFactory,
      skillsRefresh,
    );

    runKnowledgeReindexMock.mockResolvedValue({
      indexed: 1,
      skipped: 0,
      deleted: 0,
      chunks: 2,
      durationMs: 10,
    });
  });

  it('runBeforeListen no-ops when startup reindex disabled', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'knowledge.startupReindex') return false;
      return undefined;
    });

    await service.runBeforeListen();

    expect(countFiles).not.toHaveBeenCalled();
  });

  it('runBeforeListen runs cold reindex when index empty', async () => {
    countFiles.mockResolvedValue(0);

    await service.runBeforeListen();

    expect(runKnowledgeReindexMock).toHaveBeenCalledWith(db, {
      workspaceRoot: '/app',
      writeAgentRoutes: false,
    });
    expect(redisSet).toHaveBeenCalled();
    expect(seedFromSnapshot).toHaveBeenCalled();
  });

  it('runBeforeListen seeds skills snapshot when docs exist but odl/ is empty', async () => {
    countFiles.mockResolvedValue(5);
    listPaths.mockResolvedValue(['docs/getting-started.md']);

    await service.runBeforeListen();

    expect(runKnowledgeReindexMock).not.toHaveBeenCalled();
    expect(seedFromSnapshot).toHaveBeenCalled();
  });

  it('runBeforeListen skips docs reindex when index already warm', async () => {
    countFiles.mockResolvedValue(5);

    await service.runBeforeListen();

    expect(runKnowledgeReindexMock).not.toHaveBeenCalled();
    expect(seedFromSnapshot).not.toHaveBeenCalled();
    expect(reparseSkillsFromStoredBodiesMock).toHaveBeenCalled();
  });

  it('runBeforeListen reparses stored odl/ bodies instead of snapshot when descriptions are YAML markers', async () => {
    countFiles.mockResolvedValue(5);
    reparseSkillsFromStoredBodiesMock.mockResolvedValue({
      indexed: 1,
      skipped: 0,
      deleted: 0,
      chunks: 1,
      durationMs: 3,
    });

    await service.runBeforeListen();

    expect(runKnowledgeReindexMock).not.toHaveBeenCalled();
    expect(seedFromSnapshot).not.toHaveBeenCalled();
    expect(reparseSkillsFromStoredBodiesMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ warn: expect.any(Function) }),
    );
  });

  it('runAfterListen skips warm reindex when throttled', async () => {
    countFiles.mockResolvedValue(10);
    redisGet.mockResolvedValue(String(Date.now() - 1_000));

    service.runAfterListen();
    await Promise.resolve();

    expect(runKnowledgeReindexMock).not.toHaveBeenCalled();
  });

  it('runAfterListen skips warm reindex when lock not acquired', async () => {
    countFiles.mockResolvedValue(10);
    trySetNx.mockResolvedValue(false);

    service.runAfterListen();
    await Promise.resolve();

    expect(runKnowledgeReindexMock).not.toHaveBeenCalled();
  });

  it('runAfterListen runs warm reindex when due', async () => {
    countFiles.mockResolvedValue(10);
    redisGet.mockResolvedValue(String(Date.now() - 400_000));

    service.runAfterListen();
    await new Promise((r) => setTimeout(r, 0));

    expect(runKnowledgeReindexMock).toHaveBeenCalled();
  });
});
