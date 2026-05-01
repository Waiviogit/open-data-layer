import type {
  FindContractParams,
  FindContractTableParams,
  FindOneContractParams,
  HiveEngineBlock,
  HiveEngineCommentPost,
  HiveEngineCommentVote,
  HiveEngineContractQuery,
  HiveEngineLiquidityPosition,
  HiveEngineMarketPool,
  HiveEngineMiningPool,
  HiveEngineRewardPool,
  HiveEngineStatus,
  HiveEngineToken,
  HiveEngineTokenBalance,
  HiveEngineTokenDelegation,
  HiveEngineTokenFund,
  HiveEngineTokenPendingUnstake,
  HiveEngineVotingPower,
} from '../type';

export interface HiveEngineClientInterface {
  find<T>(params: FindContractParams): Promise<T[]>;
  findOne<T>(params: FindOneContractParams): Promise<T | null>;
  getBlockInfo(blockNumber: number): Promise<HiveEngineBlock | undefined>;
  getStatus(): Promise<HiveEngineStatus | undefined>;

  findTokens(
    params?: FindContractTableParams,
  ): Promise<HiveEngineToken[]>;
  findOneToken(query?: HiveEngineContractQuery): Promise<HiveEngineToken | null>;

  findMiningPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineMiningPool[]>;
  findOneMiningPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineMiningPool | null>;

  findTokenFunds(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenFund[]>;
  findOneTokenFund(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenFund | null>;

  findTokenDelegations(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenDelegation[]>;
  findOneTokenDelegation(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenDelegation | null>;

  findTokenPendingUnstakes(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenPendingUnstake[]>;
  findOneTokenPendingUnstake(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenPendingUnstake | null>;

  findTokenBalances(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenBalance[]>;
  findOneTokenBalance(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenBalance | null>;

  findLiquidityPositions(
    params?: FindContractTableParams,
  ): Promise<HiveEngineLiquidityPosition[]>;
  findOneLiquidityPosition(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineLiquidityPosition | null>;

  findRewardPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineRewardPool[]>;
  findOneRewardPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineRewardPool | null>;

  findVotingPowers(
    params?: FindContractTableParams,
  ): Promise<HiveEngineVotingPower[]>;
  findOneVotingPower(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineVotingPower | null>;

  findCommentPosts(
    params?: FindContractTableParams,
  ): Promise<HiveEngineCommentPost[]>;
  findOneCommentPost(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineCommentPost | null>;

  findCommentVotes(
    params?: FindContractTableParams,
  ): Promise<HiveEngineCommentVote[]>;
  findOneCommentVote(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineCommentVote | null>;

  findMarketPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineMarketPool[]>;
  findOneMarketPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineMarketPool | null>;
}
