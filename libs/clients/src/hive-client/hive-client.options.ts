export interface HiveClientModuleOptions {
  nodes: string[];
  cachePrefix?: string;
  cacheTtlSeconds?: number;
  maxResponseTimeMs?: number;
  urlRotationDb?: number;
}

export const HIVE_CLIENT_MODULE_OPTIONS = 'HIVE_CLIENT_MODULE_OPTIONS';
