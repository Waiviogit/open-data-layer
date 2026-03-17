import { Injectable, Logger } from '@nestjs/common';
import { RedisClientFactory } from './redis-client';
import { RedisClientInterface, RedisPipelineInterface } from './interface';

export type WeightFactors = {
  errorWeight: number;
  responseTimeWeight: number;
  requestCountWeight: number;
};

export type UrlRotationOptions = {
  nodes: string[];
  cachePrefix: string;
  cacheTtlSeconds?: number;
  db?: number;
  maxResponseTimeMs?: number;
  maxRequestsForWeight?: number;
  weightFactors?: Partial<WeightFactors>;
};

type UrlStats = {
  errors: number;
  totalRequests: number;
  totalResponseTime: number;
  avgResponseTime: number;
  avgErrors: number;
  weight: number;
};

const DEFAULT_WEIGHT_FACTORS: WeightFactors = {
  errorWeight: 0.4,
  responseTimeWeight: 0.3,
  requestCountWeight: 0.3,
};

const DEFAULT_CACHE_TTL_SECONDS = 1200;
const DEFAULT_MAX_RESPONSE_TIME_MS = 5000;
const DEFAULT_MAX_REQUESTS_FOR_WEIGHT = 100;

export class UrlRotationManager {
  private readonly client: RedisClientInterface;
  private readonly logger = new Logger(UrlRotationManager.name);
  private readonly cachePrefix: string;
  private readonly cacheTtlSeconds: number;
  private readonly maxResponseTimeMs: number;
  private readonly maxRequestsForWeight: number;
  private readonly weightFactors: WeightFactors;
  private readonly nodes: string[];

  constructor(
    options: UrlRotationOptions,
    private readonly redisFactory: RedisClientFactory,
  ) {
    this.nodes = options.nodes;
    this.cachePrefix = options.cachePrefix.endsWith(':')
      ? options.cachePrefix
      : `${options.cachePrefix}:`;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
    this.maxResponseTimeMs =
      options.maxResponseTimeMs ?? DEFAULT_MAX_RESPONSE_TIME_MS;
    this.maxRequestsForWeight =
      options.maxRequestsForWeight ?? DEFAULT_MAX_REQUESTS_FOR_WEIGHT;
    this.weightFactors = {
      ...DEFAULT_WEIGHT_FACTORS,
      ...options.weightFactors,
    };
    this.client = this.redisFactory.getClient(options.db ?? 0);
  }

  private buildKey(url: string): string {
    return `${this.cachePrefix}${url}`;
  }

  private async getUrlStats(url: string): Promise<UrlStats> {
    const key = this.buildKey(url);
    const stats = await this.client.hGetAll(key);

    if (!stats || Object.keys(stats).length === 0) {
      return {
        errors: 0,
        totalRequests: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        avgErrors: 0,
        weight: 1,
      };
    }

    return {
      errors: parseInt(stats.errors) || 0,
      totalRequests: parseInt(stats.totalRequests) || 0,
      totalResponseTime: parseInt(stats.totalResponseTime) || 0,
      avgResponseTime: parseFloat(stats.avgResponseTime) || 0,
      avgErrors: parseFloat(stats.avgErrors) || 0,
      weight: parseFloat(stats.weight) || 1,
    };
  }

  private async updateCalculatedStats(url: string): Promise<void> {
    const key = this.buildKey(url);
    const stats = await this.getUrlStats(url);

    const avgResponseTime =
      stats.totalRequests > 0
        ? stats.totalResponseTime / stats.totalRequests
        : 0;

    const avgErrors =
      stats.totalRequests > 0 ? stats.errors / stats.totalRequests : 0;

    const weight = this.calculateWeight(
      avgErrors,
      avgResponseTime,
      stats.totalRequests,
    );

    const pipeline = this.client.pipeline();
    pipeline.hSet(key, 'avgResponseTime', avgResponseTime);
    pipeline.hSet(key, 'avgErrors', avgErrors);
    pipeline.hSet(key, 'weight', weight);

    await pipeline.exec();
  }

  private calculateWeight(
    avgErrors: number,
    avgResponseTime: number,
    totalRequests: number,
  ): number {
    const errorScore = Math.max(0, 1 - avgErrors);
    const responseTimeScore = Math.max(
      0,
      1 - avgResponseTime / this.maxResponseTimeMs,
    );
    const requestCountScore = Math.max(
      0,
      1 - totalRequests / this.maxRequestsForWeight,
    );

    return (
      errorScore * this.weightFactors.errorWeight +
      responseTimeScore * this.weightFactors.responseTimeWeight +
      requestCountScore * this.weightFactors.requestCountWeight
    );
  }

  private async updateUrlStats(
    url: string,
    responseTime: number,
    hasError: boolean,
  ): Promise<void> {
    const key = this.buildKey(url);
    const pipeline: RedisPipelineInterface = this.client.pipeline();

    const exists = await this.client.exists(key);

    pipeline.hIncrBy(key, 'totalRequests', 1);
    if (hasError) {
      pipeline.hIncrBy(key, 'errors', 1);
    }
    pipeline.hIncrBy(key, 'totalResponseTime', responseTime);

    if (!exists) {
      pipeline.expire(key, this.cacheTtlSeconds);
    }

    await pipeline.exec();
    await this.updateCalculatedStats(url);
  }

  async getBestUrl(): Promise<string> {
    const allStats = await Promise.all(
      this.nodes.map((node) => this.getUrlStats(node)),
    );

    const urlStats = this.nodes.map((url, index) => ({
      url,
      ...allStats[index],
    }));

    urlStats.sort((a, b) => b.weight - a.weight);

    const bestWeight = urlStats[0].weight;
    const bestNodes = urlStats.filter((item) => item.weight === bestWeight);

    if (bestNodes.length === 1) {
      return bestNodes[0].url;
    }

    const randomIndex = Math.floor(Math.random() * bestNodes.length);
    return bestNodes[randomIndex].url;
  }

  async recordRequest(
    url: string,
    responseTime: number,
    hasError: boolean,
  ): Promise<void> {
    try {
      await this.updateUrlStats(url, responseTime, hasError);
    } catch (error) {
      this.logger.warn(
        `Failed to record stats for ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

@Injectable()
export class UrlRotationService {
  private readonly managers = new Map<string, UrlRotationManager>();

  constructor(private readonly redisFactory: RedisClientFactory) {}

  getManager(options: UrlRotationOptions): UrlRotationManager {
    const key = this.buildManagerKey(options);
    if (!this.managers.has(key)) {
      this.managers.set(
        key,
        new UrlRotationManager(options, this.redisFactory),
      );
    }
    return this.managers.get(key)!;
  }

  private buildManagerKey(options: UrlRotationOptions): string {
    return `${options.cachePrefix}|${options.db ?? 0}|${options.nodes.join(',')}`;
  }
}
