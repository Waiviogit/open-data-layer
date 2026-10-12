import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildHiveEngineDepositPayload,
  buildOslHiveEngineDepositOp,
  type HiveOperation,
} from '@opden-data-layer/hive-broadcast';

import type { AgentWalletConfig } from '../config/agent-wallet.config';
import { normalizeHiveAccount } from '../utils/hive-account';

export type EngineDepositRouting = {
  readonly symbol: string;
  readonly account: string | null;
  readonly memo: string | null;
  readonly address: string | null;
  readonly pair: string | null;
  readonly exRate: number | null;
  readonly swapSymbol?: string;
};

export type BuildHiveEngineDepositInput = {
  readonly account: string;
  readonly routing: EngineDepositRouting;
};

export type HiveEngineDepositBuildResult = {
  ops: HiveOperation[];
  opsCount: number;
  bytes: number;
  keyType: 'posting';
  warnings: string[];
};

@Injectable()
export class HiveEngineDepositBuildService {
  constructor(private readonly config: ConfigService<AgentWalletConfig, true>) {}

  build(input: BuildHiveEngineDepositInput): HiveEngineDepositBuildResult {
    const account = normalizeHiveAccount(input.account);
    const symbol = input.routing.symbol.trim().toUpperCase();
    if (!symbol) {
      throw new Error('routing.symbol is required');
    }

    const swapSymbol = resolveSwapSymbol(symbol, input.routing.swapSymbol);
    const { depositAccount, address } = pickRoutingTarget(symbol, input.routing);
    const payload = buildHiveEngineDepositPayload({
      author: account,
      destination: account,
      symbol_in: symbol,
      symbol_out: swapSymbol,
      pair: input.routing.pair,
      ex_rate: input.routing.exRate,
      memo: input.routing.memo,
      deposit_account: depositAccount,
      address,
    });

    const op = buildOslHiveEngineDepositOp({
      id: this.config.get('oslCustomJsonId', { infer: true }),
      account,
      payload,
    });

    return {
      ops: [op],
      opsCount: 1,
      bytes: new TextEncoder().encode(op.json).length,
      keyType: 'posting',
      warnings: [],
    };
  }
}

export function resolveSwapSymbol(symbol: string, swapSymbol?: string): string {
  const fromRouting = swapSymbol?.trim().toUpperCase();
  if (fromRouting) {
    return fromRouting;
  }
  if (symbol.startsWith('SWAP.')) {
    return symbol;
  }
  return `SWAP.${symbol}`;
}

export function pickRoutingTarget(
  symbol: string,
  routing: Pick<EngineDepositRouting, 'account' | 'address'>,
): { depositAccount: string | null; address: string | null } {
  const depositAccount = routing.account?.trim() || null;
  const address = routing.address?.trim() || null;
  if (symbol === 'HIVE') {
    return { depositAccount, address: null };
  }
  if (address) {
    return { depositAccount: null, address };
  }
  return { depositAccount, address: null };
}
