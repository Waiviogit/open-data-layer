import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  HiveEngineConvertClient,
  HiveEngineUnavailableError,
} from '@opden-data-layer/clients';
import { isEngineDisabledDepositL1Symbol } from '@opden-data-layer/core/hive-engine-history';

import { DEFAULT_HIVE_SWAP_ACCOUNT } from '../../constants/wallet.constants';
import { AccountsCurrentRepository } from '../../repositories';
import { buildHivePeggedDepositRouting } from './engine-swap/build-hive-pegged-deposit';
import { resolveDepositSwapSymbol } from './engine-swap/build-deposit-token-list';
import type {
  EngineDepositAddressQuery,
  EngineDepositAddressResponse,
} from './schemas/engine-swap.schema';

@Injectable()
export class GetUserEngineDepositAddressEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly convertClient: HiveEngineConvertClient,
  ) {}

  async execute(
    profileAccountName: string,
    query: EngineDepositAddressQuery,
  ): Promise<EngineDepositAddressResponse | null> {
    const accountRow = await this.accounts.findByName(profileAccountName);
    if (!accountRow) {
      return null;
    }

    const symbol = query.symbol.trim().toUpperCase();
    if (!symbol) {
      throw new BadRequestException('unsupported deposit symbol');
    }

    if (isEngineDisabledDepositL1Symbol(symbol)) {
      throw new BadRequestException('unsupported deposit symbol');
    }

    if (symbol === 'HIVE') {
      const swapAccount =
        process.env.HIVE_SWAP_ACCOUNT?.trim() || DEFAULT_HIVE_SWAP_ACCOUNT;
      return buildHivePeggedDepositRouting(swapAccount, 'HIVE', profileAccountName);
    }

    const swapSymbol = resolveDepositSwapSymbol(symbol);

    try {
      const convert = await this.convertClient.convert({
        from_coin: symbol,
        to_coin: swapSymbol,
        destination: profileAccountName,
      });
      if (!convert || convert.error) {
        throw new BadRequestException(convert?.error ?? 'deposit routing unavailable');
      }

      return {
        symbol,
        account:
          convert.account ??
          convert.deposit_account ??
          null,
        memo:
          convert.memo ??
          convert.deposit_memo ??
          null,
        address:
          convert.address ??
          convert.deposit_address ??
          null,
        pair: convert.pair ?? null,
        exRate: convert.ex_rate ?? null,
        swapSymbol,
        destination: profileAccountName,
      };
    } catch (e) {
      if (e instanceof HiveEngineUnavailableError) {
        throw new ServiceUnavailableException('Hive Engine unavailable');
      }
      throw e;
    }
  }
}
