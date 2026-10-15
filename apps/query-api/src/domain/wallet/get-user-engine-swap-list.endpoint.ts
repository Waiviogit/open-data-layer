import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  HiveEngineClient,
  HiveEngineUnavailableError,
  type HiveEngineMarketPool,
  type HiveEngineTokenBalance,
} from '@opden-data-layer/clients';

import { AccountsCurrentRepository } from '../../repositories';
import { buildSwapListTokens } from './engine-swap/build-swap-list';
import type { EngineSwapListResponse } from './schemas/engine-swap.schema';

function parseTokenIcon(metadata: string | undefined): string | null {
  if (!metadata) {
    return null;
  }
  try {
    const parsed = JSON.parse(metadata) as { icon?: unknown };
    return typeof parsed.icon === 'string' && parsed.icon.length > 0
      ? parsed.icon
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class GetUserEngineSwapListEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly hiveEngine: HiveEngineClient,
  ) {}

  async execute(profileAccountName: string): Promise<EngineSwapListResponse | null> {
    const accountRow = await this.accounts.findByName(profileAccountName);
    if (!accountRow) {
      return null;
    }

    try {
      const [pools, balances] = await Promise.all([
        this.hiveEngine.findStrict<HiveEngineMarketPool>({
          contract: 'marketpools',
          table: 'pools',
          limit: 1000,
        }),
        this.hiveEngine.findStrict<HiveEngineTokenBalance>({
          contract: 'tokens',
          table: 'balances',
          query: { account: profileAccountName },
          limit: 1000,
        }),
      ]);

      const balanceSymbols = [...new Set(balances.map((row) => row.symbol))];

      const tokenRows =
        balanceSymbols.length > 0
          ? await this.hiveEngine.findTokens({
              query: { symbol: { $in: balanceSymbols } },
              limit: balanceSymbols.length,
            })
          : [];

      const tokenMetadata = new Map(
        tokenRows.map((token) => [
          token.symbol,
          { name: token.name, precision: token.precision, metadata: token.metadata },
        ]),
      );

      const tokens = buildSwapListTokens({
        pools,
        balances,
        tokenMetadata,
      }).map((token) => ({
        ...token,
        iconUrl: parseTokenIcon(tokenMetadata.get(token.symbol)?.metadata) ?? token.iconUrl,
      }));

      return {
        account: profileAccountName,
        tokens,
      };
    } catch (e) {
      if (e instanceof HiveEngineUnavailableError) {
        throw new ServiceUnavailableException('Hive Engine unavailable');
      }
      throw e;
    }
  }
}
