import { existsSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DockerComposeRunnerService } from './docker-compose-runner.service';
import { DOCKER_IMAGE_PRUNE_ARGS } from './stack-watchdog.constants';

@Injectable()
export class DockerImagePruneService {
  private readonly logger = new Logger(DockerImagePruneService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly runner: DockerComposeRunnerService,
  ) {}

  async pruneUnusedImagesOnce(): Promise<void> {
    const enabled = this.config.get<boolean>('stackWatchdog.enabled');
    if (!enabled) {
      this.logger.debug('STACK_WATCHDOG disabled; skipping image prune');
      return;
    }

    const dockerSock = '/var/run/docker.sock';
    if (!existsSync(dockerSock)) {
      this.logger.warn(
        `Docker socket missing at ${dockerSock}; skipping image prune (local dev?)`,
      );
      return;
    }

    const args = [...DOCKER_IMAGE_PRUNE_ARGS];
    this.runner.logDockerInvocation(args);

    try {
      await this.runner.runDocker(args);
      this.logger.log('docker image prune finished');
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }
}
