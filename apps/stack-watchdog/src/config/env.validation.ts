import { z } from 'zod';

/** Long-running services from docker-compose.*.apps.yml (exclude migrator, stack-watchdog). */
export const DEFAULT_RUNTIME_SERVICE_NAMES = [
  'chain-indexer',
  'ipfs-gateway',
  'query-api',
  'auth-api',
  'notifications',
  'scheduler',
  'web',
] as const;

export type StackWatchdogValidatedEnv = {
  enabled: boolean;
  deployEnv: 'staging' | 'production';
  installDir: string;
  runtimeServiceNames: string[];
  extraPullServiceNames: string[];
};

function parseCsvOptional(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function coerceEnabled(raw: Record<string, unknown>): boolean {
  const v = raw.STACK_WATCHDOG_ENABLED;
  if (v === undefined || v === '') {
    return false;
  }
  if (v === false || v === 'false' || v === '0') {
    return false;
  }
  return true;
}

export function validateStackWatchdogEnv(
  raw: Record<string, unknown>,
): StackWatchdogValidatedEnv {
  const enabled = coerceEnabled(raw);

  const runtimeOverride = parseCsvOptional(
    typeof raw.STACK_WATCH_RUNTIME_SERVICES === 'string'
      ? raw.STACK_WATCH_RUNTIME_SERVICES
      : undefined,
  );
  const extraPull = parseCsvOptional(
    typeof raw.STACK_WATCH_EXTRA_PULL_SERVICES === 'string'
      ? raw.STACK_WATCH_EXTRA_PULL_SERVICES
      : undefined,
  ) ?? [];

  if (!enabled) {
    const deployFallback = z.enum(['staging', 'production']).safeParse(raw.DEPLOY_ENV);
    const installFallback =
      typeof raw.INSTALL_DIR === 'string' && raw.INSTALL_DIR.length > 0
        ? raw.INSTALL_DIR
        : process.cwd();

    return {
      enabled: false,
      deployEnv: deployFallback.success ? deployFallback.data : 'staging',
      installDir: installFallback,
      runtimeServiceNames: [...DEFAULT_RUNTIME_SERVICE_NAMES],
      extraPullServiceNames: extraPull,
    };
  }

  const parsed = z
    .object({
      DEPLOY_ENV: z.enum(['staging', 'production']),
      INSTALL_DIR: z.string().min(1),
    })
    .parse({
      DEPLOY_ENV: raw.DEPLOY_ENV,
      INSTALL_DIR: raw.INSTALL_DIR,
    });

  return {
    enabled: true,
    deployEnv: parsed.DEPLOY_ENV,
    installDir: parsed.INSTALL_DIR,
    runtimeServiceNames: runtimeOverride ?? [...DEFAULT_RUNTIME_SERVICE_NAMES],
    extraPullServiceNames: extraPull,
  };
}
