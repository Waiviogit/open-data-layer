export type HiveEngineContractQuery = Record<string, unknown>;

export type FindContractParams = {
  contract: string;
  table: string;
  query?: HiveEngineContractQuery;
  offset?: number;
  limit?: number;
  indexes?: unknown[];
};

export type FindOneContractParams = {
  contract: string;
  table: string;
  query?: HiveEngineContractQuery;
};

/** Params for typed `find*` helpers (contract/table are fixed per method). */
export type FindContractTableParams = {
  query?: HiveEngineContractQuery;
  offset?: number;
  limit?: number;
};

export type HiveEngineToken = {
  _id: number;
  issuer: string;
  symbol: string;
  name: string;
  metadata: string;
  precision: number;
  maxSupply: string;
  supply: string;
  circulatingSupply: string;
  stakingEnabled: boolean;
  unstakingCooldown: number;
  delegationEnabled: boolean;
  undelegationCooldown: number;
  numberTransactions?: number;
  totalStaked?: string;
};

export type HiveEngineMiningPoolUpdating = {
  inProgress: boolean;
  updatePoolTimestamp: number;
  tokenIndex: number;
  nftTokenIndex: number;
  lastId: number;
};

export type HiveEngineMiningPool = {
  _id: number;
  minedToken: string;
  lotteryWinners: number;
  lotteryIntervalHours: number;
  lotteryAmount: string;
  tokenMiners: unknown[];
  active: boolean;
  nextLotteryTimestamp: number;
  totalPower: string;
  externalContract?: string;
  externalMiners?: string;
  id: string;
  updating: HiveEngineMiningPoolUpdating;
};

export type HiveEngineProposalFee = {
  method: string;
  symbol: string;
  amount: string;
};

export type HiveEngineTokenFund = {
  _id: number;
  payToken: string;
  voteToken: string;
  voteThreshold: string;
  maxDays: string;
  maxAmountPerDay: string;
  proposalFee: HiveEngineProposalFee;
  active: boolean;
  creator: string;
  lastTickTime: number;
  id: string;
};

export type HiveEngineTokenDelegation = {
  _id: number;
  from: string;
  to: string;
  symbol: string;
  quantity: string;
  created: number;
  updated: number;
};

export type HiveEngineTokenPendingUnstake = {
  _id: number;
  account: string;
  symbol: string;
  quantity: string;
  quantityLeft: string;
  nextTransactionTimestamp: number;
  numberTransactionsLeft: number;
  millisecPerPeriod: string;
  txID: string;
};

export type HiveEngineTokenBalance = {
  _id: number;
  account: string;
  symbol: string;
  balance: string;
  stake: string;
  pendingUnstake: string;
  delegationsIn: string;
  delegationsOut: string;
  pendingUndelegations: string;
};

export type HiveEngineLiquidityPosition = {
  _id: number;
  account: string;
  tokenPair: string;
  shares: string;
  timeFactor: number;
};

export type HiveEngineRewardPoolConfig = {
  postRewardCurve: string;
  postRewardCurveParameter: string;
  curationRewardCurve: string;
  curationRewardCurveParameter: string;
  curationRewardPercentage: number;
  cashoutWindowDays: number;
  rewardPerInterval: string;
  rewardIntervalSeconds: number;
  voteRegenerationDays: number;
  downvoteRegenerationDays: number;
  stakedRewardPercentage: number;
  votePowerConsumption: number;
  downvotePowerConsumption: number;
  tags: string[];
};

export type HiveEngineRewardPool = {
  _id: number;
  symbol: string;
  rewardPool: string;
  lastRewardTimestamp: number;
  lastClaimDecayTimestamp: number;
  createdTimestamp: number;
  config: HiveEngineRewardPoolConfig;
  pendingClaims: string;
  active: boolean;
  intervalPendingClaims: string;
  intervalRewardPool: string;
};

export type HiveEngineVotingPower = {
  _id: { rewardPoolId: number; account: string };
  rewardPoolId: number;
  account: string;
  lastVoteTimestamp: number;
  votingPower: number;
  downvotingPower: number;
};

export type HiveEngineCommentPost = {
  _id: { authorperm: string; rewardPoolId: number };
  rewardPoolId: number;
  symbol: string;
  authorperm: string;
  author: string;
  created: number;
  cashoutTime: number;
  votePositiveRshareSum: string;
  voteRshareSum: string;
  app: string;
};

export type HiveEngineCommentVote = {
  _id: { rewardPoolId: number; authorperm: string; voter: string };
  rewardPoolId: number;
  symbol: string;
  authorperm: string;
  weight: number;
  rshares: string;
  curationWeight: string;
  timestamp: number;
  voter: string;
};

export type HiveEngineMarketPool = {
  _id: number;
  tokenPair: string;
  baseQuantity: string;
  baseVolume: string;
  basePrice: string;
  quoteQuantity: string;
  quoteVolume: string;
  quotePrice: string;
  totalShares: string;
  precision: number;
  creator: string;
};

export type HiveEngineTransaction = {
  refHiveBlockNumber: number;
  transactionId: string;
  sender: string;
  contract: string;
  action: string;
  payload: string;
  executedCodeHash: string;
  hash: string;
  databaseHash: string;
  logs: string;
};

/** Parsed `tokens` contract stake / unstake payload (`to` is the staker). */
export type HiveEngineTokensStakePayload = {
  symbol: string;
  quantity?: string;
  to: string;
  isSignedWithActiveKey?: boolean;
};

/** Parsed `tokens` contract delegate / undelegate payload (`sender` is delegator). */
export type HiveEngineTokensDelegatePayload = {
  symbol: string;
  quantity: string;
  to: string;
  isSignedWithActiveKey?: boolean;
};

/** Parsed `tokens` contract cancelUnstake payload (quantity in logs). */
export type HiveEngineTokensCancelUnstakePayload = {
  symbol: string;
  txID: string;
  isSignedWithActiveKey?: boolean;
};

export type HiveEngineTokensLogEvent = {
  contract: string;
  event: string;
  data: Record<string, unknown>;
};

export type HiveEngineTokensLogs = {
  events?: HiveEngineTokensLogEvent[];
};

export type HiveEngineBlock = {
  _id: number;
  blockNumber: number;
  refHiveBlockNumber: number;
  refHiveBlockId: string;
  prevRefHiveBlockId: string;
  previousHash: string;
  previousDatabaseHash: string;
  timestamp: string;
  transactions: HiveEngineTransaction[];
  virtualTransactions: unknown[];
  hash: string;
  databaseHash: string;
  merkleRoot: string;
  round: number | null;
  roundHash: string;
  witness: string;
  signingKey: string;
  roundSignature: string;
  enablePerUserTxLimit: boolean;
};

export type HiveEngineDisabledMethods = {
  blockchain: string[];
  contracts: string[];
};

export type HiveEngineStatus = {
  lastBlockNumber: number;
  lastBlockRefHiveBlockNumber: number;
  lastHash: string;
  lastParsedHiveBlockNumber: number;
  SSCnodeVersion: string;
  domain: string;
  chainId: string;
  disabledMethods: HiveEngineDisabledMethods;
  lightNode: boolean;
  lastVerifiedBlockNumber: number;
  blocksToKeep?: number;
  firstBlockNumber?: number;
};
