import { Inject, Injectable, Logger } from '@nestjs/common';
import { UrlRotationManager, UrlRotationService } from '../redis-client';
import {
  HE_ENDPOINT,
  JSON_RPC_REQUEST_ID,
} from './constants';
import { HIVE_ENGINE_CLIENT_MODULE_OPTIONS } from './hive-engine-client.options';
import type { HiveEngineClientModuleOptions } from './hive-engine-client.options';
import type { HiveEngineClientInterface } from './interface';
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
} from './type';

const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class HiveEngineClient implements HiveEngineClientInterface {
  private readonly logger = new Logger(HiveEngineClient.name);
  private readonly urlRotationManager: UrlRotationManager;

  constructor(
    @Inject(HIVE_ENGINE_CLIENT_MODULE_OPTIONS)
    private readonly options: HiveEngineClientModuleOptions,
    private readonly urlRotationService: UrlRotationService,
  ) {
    this.urlRotationManager = this.urlRotationService.getManager({
      nodes: this.options.nodes,
      cachePrefix: this.options.cachePrefix ?? 'hive_engine_client_url_rotation',
      cacheTtlSeconds: this.options.cacheTtlSeconds ?? 1200,
      maxResponseTimeMs: this.options.maxResponseTimeMs ?? 8000,
      db: this.options.urlRotationDb ?? 0,
    });
  }

  private requestTimeoutMs(): number {
    return this.options.maxResponseTimeMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private async pickNode(): Promise<string> {
    try {
      return await this.urlRotationManager.getBestUrl();
    } catch (error) {
      this.logger.warn(
        `Falling back to default node: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.options.nodes[0];
    }
  }

  private async recordRequest(
    url: string,
    responseTime: number,
    hasError: boolean,
  ): Promise<void> {
    await this.urlRotationManager.recordRequest(url, responseTime, hasError);
  }

  private normalizeNodeBase(node: string): string {
    return node.replace(/\/+$/, '');
  }

  private buildRequestUrl(node: string, pathSegment: string): string {
    return `${this.normalizeNodeBase(node)}/${pathSegment}`;
  }

  private async engineRequest<T>(
    pathSegment: string,
    method: string,
    params: unknown,
  ): Promise<T | undefined> {
    const node = await this.pickNode();
    const requestUrl = this.buildRequestUrl(node, pathSegment);
    const start = Date.now();
    let hasError = false;
    const controller = new AbortController();
    const timeoutMs = this.requestTimeoutMs();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: JSON_RPC_REQUEST_ID,
        }),
        signal: controller.signal,
      });

      const data = (await resp.json()) as {
        result?: T;
        error?: unknown;
      };

      hasError = !resp.ok || Boolean(data?.error);
      return data?.result;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      hasError = true;
      return undefined;
    } finally {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;
      await this.recordRequest(node, responseTime, hasError);
    }
  }

  private contractsRequest<T>(method: string, params: unknown): Promise<T | undefined> {
    return this.engineRequest<T>(HE_ENDPOINT.CONTRACTS, method, params);
  }

  private blockchainRequest<T>(
    method: string,
    params: unknown,
  ): Promise<T | undefined> {
    return this.engineRequest<T>(HE_ENDPOINT.BLOCKCHAIN, method, params);
  }

  async find<T>(params: FindContractParams): Promise<T[]> {
    const result = await this.contractsRequest<T[] | T | null>('find', params);
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  }

  async findOne<T>(params: FindOneContractParams): Promise<T | null> {
    const result = await this.contractsRequest<T | T[] | null>('findOne', params);
    if (result === undefined || result === null) {
      return null;
    }
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result;
  }

  findTokens(
    params?: FindContractTableParams,
  ): Promise<HiveEngineToken[]> {
    return this.find<HiveEngineToken>({
      contract: 'tokens',
      table: 'tokens',
      ...params,
    });
  }

  findOneToken(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineToken | null> {
    return this.findOne<HiveEngineToken>({
      contract: 'tokens',
      table: 'tokens',
      query,
    });
  }

  findMiningPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineMiningPool[]> {
    return this.find<HiveEngineMiningPool>({
      contract: 'mining',
      table: 'pools',
      ...params,
    });
  }

  findOneMiningPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineMiningPool | null> {
    return this.findOne<HiveEngineMiningPool>({
      contract: 'mining',
      table: 'pools',
      query,
    });
  }

  findTokenFunds(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenFund[]> {
    return this.find<HiveEngineTokenFund>({
      contract: 'tokenfunds',
      table: 'funds',
      ...params,
    });
  }

  findOneTokenFund(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenFund | null> {
    return this.findOne<HiveEngineTokenFund>({
      contract: 'tokenfunds',
      table: 'funds',
      query,
    });
  }

  findTokenDelegations(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenDelegation[]> {
    return this.find<HiveEngineTokenDelegation>({
      contract: 'tokens',
      table: 'delegations',
      ...params,
    });
  }

  findOneTokenDelegation(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenDelegation | null> {
    return this.findOne<HiveEngineTokenDelegation>({
      contract: 'tokens',
      table: 'delegations',
      query,
    });
  }

  findTokenPendingUnstakes(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenPendingUnstake[]> {
    return this.find<HiveEngineTokenPendingUnstake>({
      contract: 'tokens',
      table: 'pendingUnstakes',
      ...params,
    });
  }

  findOneTokenPendingUnstake(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenPendingUnstake | null> {
    return this.findOne<HiveEngineTokenPendingUnstake>({
      contract: 'tokens',
      table: 'pendingUnstakes',
      query,
    });
  }

  findTokenBalances(
    params?: FindContractTableParams,
  ): Promise<HiveEngineTokenBalance[]> {
    return this.find<HiveEngineTokenBalance>({
      contract: 'tokens',
      table: 'balances',
      ...params,
    });
  }

  findOneTokenBalance(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineTokenBalance | null> {
    return this.findOne<HiveEngineTokenBalance>({
      contract: 'tokens',
      table: 'balances',
      query,
    });
  }

  findLiquidityPositions(
    params?: FindContractTableParams,
  ): Promise<HiveEngineLiquidityPosition[]> {
    return this.find<HiveEngineLiquidityPosition>({
      contract: 'marketpools',
      table: 'liquidityPositions',
      ...params,
    });
  }

  findOneLiquidityPosition(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineLiquidityPosition | null> {
    return this.findOne<HiveEngineLiquidityPosition>({
      contract: 'marketpools',
      table: 'liquidityPositions',
      query,
    });
  }

  findRewardPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineRewardPool[]> {
    return this.find<HiveEngineRewardPool>({
      contract: 'comments',
      table: 'rewardPools',
      ...params,
    });
  }

  findOneRewardPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineRewardPool | null> {
    return this.findOne<HiveEngineRewardPool>({
      contract: 'comments',
      table: 'rewardPools',
      query,
    });
  }

  findVotingPowers(
    params?: FindContractTableParams,
  ): Promise<HiveEngineVotingPower[]> {
    return this.find<HiveEngineVotingPower>({
      contract: 'comments',
      table: 'votingPower',
      ...params,
    });
  }

  findOneVotingPower(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineVotingPower | null> {
    return this.findOne<HiveEngineVotingPower>({
      contract: 'comments',
      table: 'votingPower',
      query,
    });
  }

  findCommentPosts(
    params?: FindContractTableParams,
  ): Promise<HiveEngineCommentPost[]> {
    return this.find<HiveEngineCommentPost>({
      contract: 'comments',
      table: 'posts',
      ...params,
    });
  }

  findOneCommentPost(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineCommentPost | null> {
    return this.findOne<HiveEngineCommentPost>({
      contract: 'comments',
      table: 'posts',
      query,
    });
  }

  findCommentVotes(
    params?: FindContractTableParams,
  ): Promise<HiveEngineCommentVote[]> {
    return this.find<HiveEngineCommentVote>({
      contract: 'comments',
      table: 'votes',
      ...params,
    });
  }

  findOneCommentVote(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineCommentVote | null> {
    return this.findOne<HiveEngineCommentVote>({
      contract: 'comments',
      table: 'votes',
      query,
    });
  }

  findMarketPools(
    params?: FindContractTableParams,
  ): Promise<HiveEngineMarketPool[]> {
    return this.find<HiveEngineMarketPool>({
      contract: 'marketpools',
      table: 'pools',
      ...params,
    });
  }

  findOneMarketPool(
    query?: HiveEngineContractQuery,
  ): Promise<HiveEngineMarketPool | null> {
    return this.findOne<HiveEngineMarketPool>({
      contract: 'marketpools',
      table: 'pools',
      query,
    });
  }

  getBlockInfo(blockNumber: number): Promise<HiveEngineBlock | undefined> {
    return this.blockchainRequest<HiveEngineBlock>('getBlockInfo', {
      blockNumber,
    });
  }

  getStatus(): Promise<HiveEngineStatus | undefined> {
    return this.blockchainRequest<HiveEngineStatus>('getStatus', {});
  }
}
