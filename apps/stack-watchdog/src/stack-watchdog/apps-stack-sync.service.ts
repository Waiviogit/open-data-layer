import { existsSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DockerComposeRunnerService } from './docker-compose-runner.service';

export const STACK_WATCHDOG_SERVICE_NAME = 'stack-watchdog';
export const MIGRATOR_SERVICE_NAME = 'migrator';

export type StackWatchdogSettings = {
  enabled: boolean;
  deployEnv: 'staging' | 'production';
  installDir: string;
  runtimeServiceNames: string[];
  extraPullServiceNames: string[];
};

/** INSTALL_DIR is always POSIX-style in compose (Linux hosts). */
export function posixInstallRoot(dir: string): string {
  return dir.replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Preserves first-seen order; omits duplicates. */
export function uniqueServiceNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function composeBaseArgs(sw: StackWatchdogSettings): string[] {
  const root = posixInstallRoot(sw.installDir);
  const envFile = `${root}/.env`;
  const composeFile = `${root}/docker-compose.${sw.deployEnv}.apps.yml`;
  return ['-p', 'apps', '--env-file', envFile, '-f', composeFile];
}

export function computePullServiceNames(sw: StackWatchdogSettings): string[] {
  return uniqueServiceNames([
    ...sw.runtimeServiceNames,
    MIGRATOR_SERVICE_NAME,
    STACK_WATCHDOG_SERVICE_NAME,
    ...sw.extraPullServiceNames,
  ]);
}

export function computeUpServiceNames(sw: StackWatchdogSettings): string[] {
  return uniqueServiceNames([...sw.runtimeServiceNames]);
}

@Injectable()
export class AppsStackSyncService {
  private readonly logger = new Logger(AppsStackSyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly runner: DockerComposeRunnerService,
  ) {}

  private settings(): StackWatchdogSettings {
    return this.config.getOrThrow<StackWatchdogSettings>('stackWatchdog');
  }

  async syncOnce(): Promise<void> {
    const sw = this.settings();

    if (!sw.enabled) {
      this.logger.debug('STACK_WATCHDOG disabled; skipping sync');
      return;
    }

    const dockerSock = '/var/run/docker.sock';
    if (!existsSync(dockerSock)) {
      this.logger.warn(
        `Docker socket missing at ${dockerSock}; skipping stack sync (local dev?)`,
      );
      return;
    }

    const pullNames = computePullServiceNames(sw);
    const upNames = computeUpServiceNames(sw);

    const pullArgs = [...composeBaseArgs(sw), 'pull', ...pullNames];
    this.runner.logComposeInvocation(pullArgs);

    try {
      await this.runner.runCompose(pullArgs);
      this.logger.log('compose pull finished');
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }

    const upArgs = [
      ...composeBaseArgs(sw),
      'up',
      '-d',
      '--remove-orphans',
      ...upNames,
    ];
    this.runner.logComposeInvocation(upArgs);

    try {
      await this.runner.runCompose(upArgs);
      this.logger.log('compose up finished');
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }
}
