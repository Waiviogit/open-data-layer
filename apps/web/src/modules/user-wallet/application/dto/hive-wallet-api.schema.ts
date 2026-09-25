import { z } from 'zod';

const hiveWalletFlagsSchema = z.object({
  showDelegationsRow: z.boolean(),
  showPowerDownRow: z.boolean(),
  showInterestRow: z.boolean(),
  showHiveSavingsPending: z.boolean(),
  showHbdSavingsPending: z.boolean(),
  showRcDelegationsRow: z.boolean().optional().default(false),
});

const hiveWalletPowerDownSchema = z.object({
  toWithdrawHp: z.string(),
  vestingWithdrawRateHp: z.string(),
  nextVestingWithdrawal: z.string().nullable(),
  weeksRemaining: z.number().optional().default(0),
  weeksTotal: z.number().optional().default(13),
});

const hiveWalletInterestSchema = z.object({
  canClaim: z.boolean(),
  daysUntilClaim: z.number().optional().default(0),
});

const hivePendingRewardsSchema = z.object({
  hive: z.string(),
  hbd: z.string(),
  vesting: z.string(),
  display: z.object({
    hive: z.string(),
    hbd: z.string(),
    hp: z.string(),
  }),
  hasRewards: z.boolean(),
});

export const hiveWalletApiResponseSchema = z.object({
  account: z.string(),
  balance: z.object({
    liquidHive: z.string(),
    hivePower: z.string(),
    delegatableHp: z.string().optional(),
    delegationsNetHp: z.string(),
    rcMax: z.string(),
    hiveSavings: z.string(),
    hbdLiquid: z.string(),
    hbdSavings: z.string(),
    hbdInterest: z.string(),
    toWithdrawHp: z.string(),
    vestingWithdrawRateHp: z.string(),
  }),
  display: z.object({
    liquidHive: z.string(),
    hivePower: z.string(),
    delegationsNetHp: z.string(),
    rcMax: z.string(),
    rcDelegationsNet: z.string().optional(),
    hiveSavings: z.string(),
    hbdLiquid: z.string(),
    hbdSavings: z.string(),
    hbdInterest: z.string(),
    estAccountValueUsd: z.string(),
  }),
  flags: hiveWalletFlagsSchema,
  rc: z
    .object({
      totalOwned: z.string(),
      maxCapacity: z.string(),
      currentMana: z.string(),
      delegatedRc: z.string(),
      receivedDelegatedRc: z.string(),
    })
    .optional(),
  powerDown: hiveWalletPowerDownSchema.optional(),
  interest: hiveWalletInterestSchema.optional(),
  pendingSavingsWithdrawals: z.array(
    z.object({
      requestId: z.number(),
      amount: z.string(),
      asset: z.enum(['HIVE', 'HBD']),
      to: z.string(),
      memo: z.string(),
      complete: z.string().optional(),
      daysRemaining: z.number().nullable().optional(),
    }),
  ),
  chain: z.object({
    totalVestingShares: z.string(),
    totalVestingFundSteem: z.string(),
  }),
  rates: z.object({
    hiveUsd: z.number(),
    hbdUsd: z.number(),
  }),
  pendingRewards: hivePendingRewardsSchema,
});

export type HiveWalletApiResponse = z.infer<typeof hiveWalletApiResponseSchema>;

export const hiveHpDelegationsApiResponseSchema = z.object({
  account: z.string(),
  incoming: z.array(
    z.object({
      delegator: z.string(),
      delegatee: z.string(),
      vestingShares: z.string(),
      hp: z.string(),
      minDelegationTime: z.string(),
    }),
  ),
  outgoing: z.array(
    z.object({
      delegator: z.string(),
      delegatee: z.string(),
      vestingShares: z.string(),
      hp: z.string(),
      minDelegationTime: z.string(),
    }),
  ),
  expirations: z
    .array(
      z.object({
        delegator: z.string(),
        vestingShares: z.string(),
        hp: z.string(),
        completionDate: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export const hiveRcDelegationsApiResponseSchema = z.object({
  account: z.string(),
  incoming: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      delegatedRc: z.number(),
    }),
  ),
  outgoing: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      delegatedRc: z.number(),
    }),
  ),
});
