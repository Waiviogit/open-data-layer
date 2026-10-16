import { Injectable, Logger } from '@nestjs/common';
import {
  HiveClient,
  HiveEngineClient,
} from '@opden-data-layer/clients';
import { CurrencyQueryService } from '@opden-data-layer/currency';
import { WAIV_TOKEN } from '@opden-data-layer/core';

import { AccountsCurrentRepository } from '../../repositories';
import { mapRcAccountToSnapshot } from '../wallet/build-hive-wallet-summary';
import { calculateAccountVoteValues } from './calculate-account-vote-values';
import { calculateEngineManaPercent } from './calculate-engine-mana';
import {
  calculateHiveDownvotingManaPercent,
  calculateHiveUpvotingManaPercent,
} from './calculate-hive-voting-mana';
import { formatHiveReputation } from './format-hive-reputation';
import { HiveAccountsCache } from './hive-accounts.cache';
import { HiveRewardFundCache } from './hive-reward-fund.cache';
import { parsePostingMetadata } from './parse-posting-metadata';
import { parseProfileCryptoWallets } from './parse-profile-crypto-wallets';
import { parseProfileSocialLinks } from './parse-profile-social-links';
import { resolvePostingJsonMetadata } from './resolve-posting-json-metadata';
import type { UserAccountSidebarView } from './user-account-sidebar.types';
import { WaivDieselPoolCache } from './waiv-diesel-pool.cache';
import { WaivRewardPoolCache } from './waiv-reward-pool.cache';

function parseCoingeckoUsd(block: unknown): number {
  if (!block || typeof block !== 'object') {
    return 0;
  }
  const usd = (block as { usd?: unknown }).usd;
  const parsed = Number(usd);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unixToIso(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value * 1000).toISOString();
}

@Injectable()
export class GetUserAccountSidebarEndpoint {
  private readonly logger = new Logger(GetUserAccountSidebarEndpoint.name);

  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly hiveAccounts: HiveAccountsCache,
    private readonly hiveClient: HiveClient,
    private readonly hiveEngine: HiveEngineClient,
    private readonly hiveRewardFund: HiveRewardFundCache,
    private readonly waivRewardPool: WaivRewardPoolCache,
    private readonly waivDieselPool: WaivDieselPoolCache,
    private readonly currencyQuery: CurrencyQueryService,
  ) {}

  async execute(accountName: string): Promise<UserAccountSidebarView | null> {
    const row = await this.accounts.findByName(accountName);
    if (!row) {
      return null;
    }

    const normalized = accountName.trim().toLowerCase();

    const joinedAt = row.created?.trim() ? row.created : null;
    const lastActivityAt =
      unixToIso(row.last_activity) ?? joinedAt;

    let postingJsonMetadata = row.posting_json_metadata;
    let hiveUp = 100;
    let hiveDown = 100;
    let hiveRep = 25;
    let rcPercent = 0;
    let voteValues = {
      estimatedHiveUsd: 0,
      estimatedWaivUsd: 0,
      totalVoteValueUsd: 0,
    };
    let waivMana = { upvotingManaPercent: 100, downvotingManaPercent: 100 };

    try {
      const [
        hiveAccount,
        rcAccounts,
        rewardFund,
        waivRewardRate,
        market,
        engineRates,
        engineVp,
        waivBalance,
        quotePriceHive,
      ] = await Promise.all([
        this.hiveAccounts.getAccount(normalized),
        this.hiveClient.findRcAccountsStrict([normalized]),
        this.hiveRewardFund.getRewardPerClaim(),
        this.waivRewardPool.getRewardRate(),
        this.currencyQuery.marketInfo({}),
        this.currencyQuery.engineLatestStored(WAIV_TOKEN.SYMBOL),
        this.hiveEngine.findOneVotingPower({
          _id: { rewardPoolId: WAIV_TOKEN.REWARD_POOL_ID, account: normalized },
        }),
        this.hiveEngine.findOneTokenBalance({
          account: normalized,
          symbol: WAIV_TOKEN.SYMBOL,
        }),
        this.waivDieselPool.getQuotePriceHive(),
      ]);

      if (hiveAccount) {
        postingJsonMetadata = resolvePostingJsonMetadata(
          row.posting_json_metadata,
          hiveAccount.posting_json_metadata,
        );
        hiveUp = calculateHiveUpvotingManaPercent(hiveAccount);
        hiveDown = calculateHiveDownvotingManaPercent(hiveAccount, hiveUp);
        hiveRep = formatHiveReputation(hiveAccount.reputation);
      }

      const rcSnapshot = mapRcAccountToSnapshot(rcAccounts[0]);
      if (rcSnapshot.maxRc > 0) {
        rcPercent = Math.round((rcSnapshot.currentMana / rcSnapshot.maxRc) * 10000) / 100;
      }

      waivMana = calculateEngineManaPercent(engineVp);

      const hiveUsd = parseCoingeckoUsd(market.current.hive);
      const waivUsd = engineRates?.USD ?? 0;
      const stake = Number.parseFloat(waivBalance?.stake ?? '0');
      const delegationsIn = Number.parseFloat(waivBalance?.delegationsIn ?? '0');

      voteValues = calculateAccountVoteValues({
        account: hiveAccount ?? {},
        rewardBalance: rewardFund.rewardBalance,
        recentClaims: rewardFund.recentClaims,
        hiveUsd,
        waivStake: Number.isFinite(stake) ? stake : 0,
        waivDelegationsIn: Number.isFinite(delegationsIn) ? delegationsIn : 0,
        engineVotingPowerPercent: waivMana.upvotingManaPercent,
        waivRewardRate,
        waivQuotePriceHive: quotePriceHive,
        hiveUsdForWaiv: hiveUsd,
      });
    } catch (e) {
      this.logger.warn(
        `account sidebar chain data degraded for ${normalized}: ${(e as Error).message}`,
      );
    }

    const meta = parsePostingMetadata(postingJsonMetadata);
    const profile = meta?.profile;
    const socialLinks = parseProfileSocialLinks(meta?.profileFields);
    const cryptoWallets = parseProfileCryptoWallets(meta?.profileFields);

    return {
      about: profile?.about?.trim() ?? '',
      location: profile?.location?.trim() || null,
      website: profile?.website?.trim() || null,
      email: profile?.email?.trim() || null,
      joinedAt,
      expertiseWeight: row.wobjects_weight ?? 0,
      lastActivityAt,
      totalVoteValueUsd: voteValues.totalVoteValueUsd,
      socialLinks,
      cryptoWallets,
      waiv: {
        upvotingManaPercent: waivMana.upvotingManaPercent,
        downvotingManaPercent: waivMana.downvotingManaPercent,
        voteValueUsd: voteValues.estimatedWaivUsd,
      },
      hive: {
        reputation: hiveRep,
        upvotingManaPercent: hiveUp,
        downvotingManaPercent: hiveDown,
        resourceCreditsPercent: rcPercent,
        voteValueUsd: voteValues.estimatedHiveUsd,
      },
    };
  }
}
