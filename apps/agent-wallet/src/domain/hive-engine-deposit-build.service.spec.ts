import { ConfigService } from '@nestjs/config';
import type { CustomJsonOp } from '@opden-data-layer/hive-broadcast';

import { HiveEngineDepositBuildService } from './hive-engine-deposit-build.service';
import type { AgentWalletConfig } from '../config/agent-wallet.config';

function asCustomJson(op: unknown): CustomJsonOp {
  return op as CustomJsonOp;
}

describe('HiveEngineDepositBuildService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'oslCustomJsonId') {
        return 'osl-testnet';
      }
      return undefined;
    }),
  } as unknown as ConfigService<AgentWalletConfig, true>;

  let service: HiveEngineDepositBuildService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HiveEngineDepositBuildService(config);
  });

  it('builds BTC address-only instruction with posting keyType', () => {
    const result = service.build({
      account: 'Irenok.agent',
      routing: {
        symbol: 'BTC',
        account: null,
        memo: null,
        address: 'bc1q9swqg00dfd7263lgdqr8qcpxmmyj20e2t9xnkg',
        pair: 'BTC/SWAP.BTC',
        exRate: 1.01,
        swapSymbol: 'SWAP.BTC',
      },
    });

    expect(result.keyType).toBe('posting');
    expect(result.opsCount).toBe(1);
    const op = asCustomJson(result.ops[0]);
    expect(op.id).toBe('osl-testnet');
    expect(op.required_posting_auths).toEqual(['irenok.agent']);
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.action).toBe('hive_engine_deposit');
    expect(parsed.events[0]?.payload).toMatchObject({
      author: 'irenok.agent',
      destination: 'irenok.agent',
      symbol_in: 'BTC',
      symbol_out: 'SWAP.BTC',
      address: 'bc1q9swqg00dfd7263lgdqr8qcpxmmyj20e2t9xnkg',
    });
    expect(parsed.events[0]?.payload['deposit_account']).toBeUndefined();
  });

  it('builds HIVE deposit_account instruction and ignores address', () => {
    const result = service.build({
      account: 'alice',
      routing: {
        symbol: 'HIVE',
        account: 'honey-swap',
        memo: '{"id":"ssc-mainnet-hive"}',
        address: 'should-be-ignored',
        pair: 'HIVE -> SWAP.HIVE',
        exRate: 1,
      },
    });

    const op = asCustomJson(result.ops[0]);
    const parsed = JSON.parse(op.json) as {
      events: { payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.payload).toMatchObject({
      symbol_in: 'HIVE',
      symbol_out: 'SWAP.HIVE',
      deposit_account: 'honey-swap',
    });
    expect(parsed.events[0]?.payload['address']).toBeUndefined();
  });

  it('prefers address over deposit_account for BTC when both are present', () => {
    const result = service.build({
      account: 'alice',
      routing: {
        symbol: 'BTC',
        account: 'honey-swap',
        memo: null,
        address: 'bc1qabc',
        pair: null,
        exRate: null,
      },
    });

    const op = asCustomJson(result.ops[0]);
    const parsed = JSON.parse(op.json) as {
      events: { payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.payload['address']).toBe('bc1qabc');
    expect(parsed.events[0]?.payload['deposit_account']).toBeUndefined();
    expect(parsed.events[0]?.payload['pair']).toBe('BTC -> SWAP.BTC');
    expect(parsed.events[0]?.payload['ex_rate']).toBe(1);
  });

  it('throws when neither address nor deposit account is present', () => {
    expect(() =>
      service.build({
        account: 'alice',
        routing: {
          symbol: 'BTC',
          account: null,
          memo: null,
          address: null,
          pair: null,
          exRate: null,
        },
      }),
    ).toThrow(/deposit account or address/);
  });
});
