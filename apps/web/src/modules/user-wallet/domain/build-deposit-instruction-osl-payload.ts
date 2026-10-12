import {
  buildHiveEngineDepositPayload,
  type BuildOslHiveEngineDepositOpInput,
} from '@opden-data-layer/hive-broadcast';

export type BuildDepositInstructionOslPayloadInput = {
  account: string;
  destination: string;
  symbolIn: string;
  symbolOut: string;
  pair: string;
  exRate: number;
  memo: string | null;
  depositAccount: string | null;
  address: string | null;
};

export type BuildDepositInstructionBroadcastInput = Omit<
  BuildDepositInstructionOslPayloadInput,
  'account'
>;

export function buildDepositInstructionOslPayload(
  input: BuildDepositInstructionOslPayloadInput,
): BuildOslHiveEngineDepositOpInput['payload'] {
  return buildHiveEngineDepositPayload({
    author: input.account,
    destination: input.destination,
    symbol_in: input.symbolIn,
    symbol_out: input.symbolOut,
    pair: input.pair,
    ex_rate: input.exRate,
    memo: input.memo,
    deposit_account: input.depositAccount,
    address: input.address,
  });
}
