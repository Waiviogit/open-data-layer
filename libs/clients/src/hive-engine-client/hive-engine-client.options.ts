export interface HiveEngineClientModuleOptions {
  nodes: string[];
  cachePrefix?: string;
  cacheTtlSeconds?: number;
  maxResponseTimeMs?: number;
  urlRotationDb?: number;
}

export const HIVE_ENGINE_CLIENT_MODULE_OPTIONS =
  'HIVE_ENGINE_CLIENT_MODULE_OPTIONS';
