import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import { OdlCustomJsonParser } from './odl-custom-json-parser';
import type { ObjectCreateHandler } from './handlers/object-create.handler';
import type { UpdateCreateHandler } from './handlers/update-create.handler';
import type { UpdateVoteHandler } from './handlers/update-vote.handler';
import type { RankVoteHandler } from './handlers/rank-vote.handler';
import type { AuthorityHandler } from './handlers/authority.handler';
import type { BatchImportHandler } from './handlers/batch-import.handler';
import type { GovernanceCacheService } from '../governance/governance-cache.service';

function hiveCtx(): HiveOperationHandlerContext {
  return {
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    transaction: { transaction_id: 'tx1' } as HiveOperationHandlerContext['transaction'],
    timestamp: new Date().toISOString(),
  };
}

describe('OdlCustomJsonParser', () => {
  const envelope = {
    events: [
      {
        action: 'object_create' as const,
        v: 1,
        payload: {
          object_id: 'o1',
          object_type: 'post',
          creator: 'alice',
          transaction_id: 't1',
        },
      },
    ],
  };

  const objectCreateHandler = {
    action: 'object_create',
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as ObjectCreateHandler;

  const updateCreateHandler = {
    action: 'update_create',
    handle: jest.fn(),
  } as unknown as UpdateCreateHandler;

  const updateVoteHandler = {
    action: 'update_vote',
    handle: jest.fn(),
  } as unknown as UpdateVoteHandler;

  const rankVoteHandler = {
    action: 'rank_vote',
    handle: jest.fn(),
  } as unknown as RankVoteHandler;

  const authorityHandler = {
    action: 'object_authority',
    handle: jest.fn(),
  } as unknown as AuthorityHandler;

  const batchImportHandler = {
    action: 'batch_import',
    handle: jest.fn(),
  } as unknown as BatchImportHandler;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when account is banned in governance snapshot', async () => {
    const governanceCache = {
      resolvePlatform: jest.fn().mockResolvedValue({
        ...DEFAULT_GOVERNANCE_SNAPSHOT,
        banned: ['banned-user'],
      }),
    } as unknown as GovernanceCacheService;

    const parser = new OdlCustomJsonParser(
      objectCreateHandler,
      updateCreateHandler,
      updateVoteHandler,
      rankVoteHandler,
      authorityHandler,
      batchImportHandler,
      governanceCache,
    );

    await parser.parse(JSON.stringify(envelope), 'banned-user', hiveCtx());

    expect(objectCreateHandler.handle).not.toHaveBeenCalled();
  });

  it('dispatches handlers when account is not banned', async () => {
    const governanceCache = {
      resolvePlatform: jest.fn().mockResolvedValue(DEFAULT_GOVERNANCE_SNAPSHOT),
    } as unknown as GovernanceCacheService;

    const parser = new OdlCustomJsonParser(
      objectCreateHandler,
      updateCreateHandler,
      updateVoteHandler,
      rankVoteHandler,
      authorityHandler,
      batchImportHandler,
      governanceCache,
    );

    await parser.parse(JSON.stringify(envelope), 'alice', hiveCtx());

    expect(objectCreateHandler.handle).toHaveBeenCalledTimes(1);
  });
});
