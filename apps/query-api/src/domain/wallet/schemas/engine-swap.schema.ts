import { z } from 'zod';

export const engineSwapListPairSchema = z.object({
  symbol: z.string(),
  tokenPair: z.string(),
  precision: z.number().int(),
});

export const engineSwapListTokenSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  balance: z.string(),
  precision: z.number().int(),
  iconUrl: z.string().nullable(),
  pairs: z.array(engineSwapListPairSchema),
});

export const engineSwapListResponseSchema = z.object({
  account: z.string(),
  tokens: z.array(engineSwapListTokenSchema),
});

export type EngineSwapListResponse = z.infer<typeof engineSwapListResponseSchema>;

export const engineSwapQuoteBodySchema = z.object({
  fromSymbol: z.string().min(1),
  toSymbol: z.string().min(1),
  amountIn: z.string().min(1),
  direction: z.enum(['exactInput', 'exactOutput']).default('exactInput'),
  slippage: z.number().min(0).max(1).optional(),
});

export type EngineSwapQuoteBody = z.infer<typeof engineSwapQuoteBodySchema>;

export const engineSwapQuoteResponseSchema = z.object({
  amountOut: z.string(),
  minAmountOut: z.string(),
  priceImpact: z.string(),
  feePercentOptions: z.array(z.number()),
  customJson: z.array(z.record(z.string(), z.unknown())),
});

export type EngineSwapQuoteResponse = z.infer<typeof engineSwapQuoteResponseSchema>;

export const engineDepositListTokenSchema = z.object({
  symbol: z.string(),
  displayName: z.string(),
  swapSymbol: z.string(),
  pairLabel: z.string(),
});

export const engineDepositListResponseSchema = z.object({
  account: z.string(),
  tokens: z.array(engineDepositListTokenSchema),
});

export type EngineDepositListResponse = z.infer<
  typeof engineDepositListResponseSchema
>;

export const engineDepositAddressQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.toUpperCase()),
});

export type EngineDepositAddressQuery = z.infer<typeof engineDepositAddressQuerySchema>;

export const engineDepositAddressResponseSchema = z.object({
  symbol: z.string(),
  account: z.string().nullable(),
  memo: z.string().nullable(),
  address: z.string().nullable(),
  pair: z.string().nullable(),
  exRate: z.number().nullable(),
  swapSymbol: z.string(),
  destination: z.string(),
});

export type EngineDepositAddressResponse = z.infer<
  typeof engineDepositAddressResponseSchema
>;

export const engineWithdrawQuoteBodySchema = z.object({
  inputSymbol: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  outputSymbol: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  quantity: z.string().min(1),
  address: z.string().optional(),
  previewOnly: z.boolean().optional().default(false),
});

export type EngineWithdrawQuoteBody = z.infer<typeof engineWithdrawQuoteBodySchema>;

export const engineWithdrawQuoteResponseSchema = z.object({
  predictiveAmount: z.number().nullable(),
  customJsonPayload: z.array(z.record(z.string(), z.unknown())),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  errorParams: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type EngineWithdrawQuoteResponse = z.infer<
  typeof engineWithdrawQuoteResponseSchema
>;

export const engineWithdrawListTokenSchema = z.object({
  inputSymbol: z.string(),
  outputSymbol: z.string(),
  balanceSymbol: z.string(),
  displayName: z.string(),
  label: z.string(),
  balance: z.string(),
  precision: z.number().int(),
  requiresExternalAddress: z.boolean(),
  minimumSwapAmount: z.number().nullable(),
  minimumReceiveAmount: z.number().nullable(),
});

export const engineWithdrawListResponseSchema = z.object({
  account: z.string(),
  tokens: z.array(engineWithdrawListTokenSchema),
});

export type EngineWithdrawListResponse = z.infer<
  typeof engineWithdrawListResponseSchema
>;
