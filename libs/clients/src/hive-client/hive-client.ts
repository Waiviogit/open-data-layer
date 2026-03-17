import { Inject, Injectable, Logger } from '@nestjs/common';
import { GetVoteInterface, HiveClientInterface } from './interface';
import { ActiveVotesType, CommentStateType, HiveContentType } from './type';
import { CommentOptionsOperation } from '@hiveio/dhive/lib/chain/operation';
import { BeneficiaryRoute } from '@hiveio/dhive/lib/chain/comment';
import { SignedBlock } from '@hiveio/dhive/lib/chain/block';
import { CONDENSER_API, BRIDGE } from './constants';
import { UrlRotationManager, UrlRotationService } from '../redis-client';
import { HIVE_CLIENT_MODULE_OPTIONS } from './hive-client.options';
import type { HiveClientModuleOptions } from './hive-client.options';

@Injectable()
export class HiveClient implements HiveClientInterface {
  private readonly logger = new Logger(HiveClient.name);
  private readonly urlRotationManager: UrlRotationManager;

  constructor(
    @Inject(HIVE_CLIENT_MODULE_OPTIONS)
    private readonly options: HiveClientModuleOptions,
    private readonly urlRotationService: UrlRotationService,
  ) {
    this.urlRotationManager = this.urlRotationService.getManager({
      nodes: this.options.nodes,
      cachePrefix: this.options.cachePrefix ?? 'hiveRpcNode',
      cacheTtlSeconds: this.options.cacheTtlSeconds ?? 1200,
      maxResponseTimeMs: this.options.maxResponseTimeMs ?? 8000,
      db: this.options.urlRotationDb ?? 10,
    });
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

  private async hiveRequest<T>(
    method: string,
    params: unknown,
  ): Promise<T | undefined> {
    const url = await this.pickNode();
    const start = Date.now();
    let hasError = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: controller.signal,
      });

      const data = (await resp.json()) as { result?: T; error?: unknown };

      hasError = !resp.ok || Boolean(data?.error);
      return data?.result;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      hasError = true;
    } finally {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;
      await this.recordRequest(url, responseTime, hasError);
    }
  }

  async getBlock(blockNumber: number): Promise<SignedBlock | undefined> {
    return this.hiveRequest(CONDENSER_API.GET_BLOCK, [blockNumber]);
  }

  getOptionsWithBeneficiaries(
    author: string,
    permlink: string,
    beneficiaries: BeneficiaryRoute[],
  ): CommentOptionsOperation[1] {
    return {
      extensions: [[0, { beneficiaries }]],
      author,
      permlink,
      max_accepted_payout: '100000.000 HBD',
      percent_hbd: 0,
      allow_votes: true,
      allow_curation_rewards: true,
    };
  }

  async getContent(
    author: string,
    permlink: string,
  ): Promise<HiveContentType | undefined> {
    return this.hiveRequest<HiveContentType>(CONDENSER_API.GET_CONTENT, [
      author,
      permlink,
    ]);
  }

  async getState(author: string, permlink: string): Promise<CommentStateType> {
    const content = await this.hiveRequest<Record<string, HiveContentType>>(
      BRIDGE.GET_DISCUSSION,
      { author, permlink },
    );

    if (content) {
      for (const contentKey in content) {
        if (content[contentKey]?.json_metadata) {
          content[contentKey].json_metadata = JSON.stringify(
            content[contentKey].json_metadata,
          );
        }
      }
    }

    return { content: content ?? {} };
  }

  async getActiveVotes(
    author: string,
    permlink: string,
  ): Promise<ActiveVotesType[]> {
    return (
      (await this.hiveRequest<ActiveVotesType[]>(
        CONDENSER_API.GET_ACTIVE_VOTES,
        [author, permlink],
      )) ?? []
    );
  }

  async getVote({
    author,
    voter,
    permlink,
  }: GetVoteInterface): Promise<ActiveVotesType | undefined> {
    const activeVotes = await this.getActiveVotes(author, permlink);
    return activeVotes?.find((v) => v.voter === voter);
  }
}
