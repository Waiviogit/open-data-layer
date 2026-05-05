import { Injectable } from '@nestjs/common';
import { HiveEngineClient } from '@opden-data-layer/clients';
import { UserObjectPowersRepository } from '../../repositories';

const WAIV_SYMBOL = 'WAIV';

function sumStakeAndDelegationsIn(balance: {
  stake: string;
  delegationsIn: string;
}): number {
  const stake = parseFloat(balance.stake);
  const delegIn = parseFloat(balance.delegationsIn);
  const s = Number.isFinite(stake) ? stake : 0;
  const d = Number.isFinite(delegIn) ? delegIn : 0;
  return s + d;
}

/**
 * Ensures `user_object_powers` has a row for an account (fresh Hive Engine balances on first insert).
 */
@Injectable()
export class UserObjectPowersEnsureService {
  constructor(
    private readonly repo: UserObjectPowersRepository,
    private readonly hiveEngineClient: HiveEngineClient,
  ) {}

  async ensure(account: string): Promise<void> {
    const trimmed = account.trim();
    if (trimmed.length === 0) {
      return;
    }
    const existing = await this.repo.findByAccount(trimmed);
    if (existing) {
      return;
    }
    const bal = await this.hiveEngineClient.findOneTokenBalance({
      symbol: WAIV_SYMBOL,
      account: trimmed,
    });
    const waiv_power = bal ? sumStakeAndDelegationsIn(bal) : 0;
    await this.repo.create(trimmed, waiv_power);
  }
}
