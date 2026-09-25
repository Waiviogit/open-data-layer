import { z } from 'zod';

export const hiveWalletBalanceSchema = z.object({
  liquidHive: z.string(),
  hivePower: z.string(),
  delegatableHp: z.string(),
  delegationsNetHp: z.string(),
  rcMax: z.string(),
  hiveSavings: z.string(),
  hbdLiquid: z.string(),
  hbdSavings: z.string(),
  hbdInterest: z.string(),
  toWithdrawHp: z.string(),
  vestingWithdrawRateHp: z.string(),
});

export const hiveWalletDisplaySchema = z.object({
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
});

export const hivePendingSavingsWithdrawalSchema = z.object({
  requestId: z.number(),
  amount: z.string(),
  asset: z.enum(['HIVE', 'HBD']),
  to: z.string(),
  memo: z.string(),
  complete: z.string().optional(),
  daysRemaining: z.number().nullable().optional(),
});

export const hiveRcSnapshotSchema = z.object({
  totalOwned: z.string(),
  maxCapacity: z.string(),
  currentMana: z.string(),
  delegatedRc: z.string(),
  receivedDelegatedRc: z.string(),
});

export const hivePendingRewardsSchema = z.object({
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

export const hiveWalletResponseSchema = z.object({
  account: z.string(),
  balance: hiveWalletBalanceSchema,
  display: hiveWalletDisplaySchema,
  flags: z.object({
    showDelegationsRow: z.boolean(),
    showPowerDownRow: z.boolean(),
    showInterestRow: z.boolean(),
    showHiveSavingsPending: z.boolean(),
    showHbdSavingsPending: z.boolean(),
    showRcDelegationsRow: z.boolean(),
  }),
  rc: hiveRcSnapshotSchema.optional(),
  powerDown: z
    .object({
      toWithdrawHp: z.string(),
      vestingWithdrawRateHp: z.string(),
      nextVestingWithdrawal: z.string().nullable(),
      weeksRemaining: z.number(),
      weeksTotal: z.number(),
    })
    .optional(),
  interest: z
    .object({
      canClaim: z.boolean(),
      daysUntilClaim: z.number(),
    })
    .optional(),
  pendingSavingsWithdrawals: z.array(hivePendingSavingsWithdrawalSchema),
  pendingRewards: hivePendingRewardsSchema,
  chain: z.object({
    totalVestingShares: z.string(),
    totalVestingFundSteem: z.string(),
  }),
  rates: z.object({
    hiveUsd: z.number(),
    hbdUsd: z.number(),
  }),
});

export type HiveWalletResponse = z.infer<typeof hiveWalletResponseSchema>;

export const hiveVestingDelegationItemSchema = z.object({
  delegator: z.string(),
  delegatee: z.string(),
  vestingShares: z.string(),
  hp: z.string(),
  minDelegationTime: z.string(),
});

export const hiveHpDelegationExpirationItemSchema = z.object({
  delegator: z.string(),
  vestingShares: z.string(),
  hp: z.string(),
  completionDate: z.string(),
});

export const hiveHpDelegationsResponseSchema = z.object({
  account: z.string(),
  incoming: z.array(hiveVestingDelegationItemSchema),
  outgoing: z.array(hiveVestingDelegationItemSchema),
  expirations: z.array(hiveHpDelegationExpirationItemSchema).optional().default([]),
});

export type HiveHpDelegationsResponse = z.infer<
  typeof hiveHpDelegationsResponseSchema
>;

export const hiveRcDelegationItemSchema = z.object({
  from: z.string(),
  to: z.string(),
  delegatedRc: z.number(),
});

export const hiveRcDelegationsResponseSchema = z.object({
  account: z.string(),
  incoming: z.array(hiveRcDelegationItemSchema),
  outgoing: z.array(hiveRcDelegationItemSchema),
});

export type HiveRcDelegationsResponse = z.infer<
  typeof hiveRcDelegationsResponseSchema
>;
