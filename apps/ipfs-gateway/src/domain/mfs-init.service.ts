import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IpfsClient } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';

@Injectable()
export class MfsInitService implements OnModuleInit {
  private readonly logger = new Logger(MfsInitService.name);

  constructor(private readonly ipfsClient: IpfsClient) {}

  async onModuleInit(): Promise<void> {
    for (const path of [MFS_NAMESPACE.IMAGES, MFS_NAMESPACE.JSON]) {
      try {
        await this.ipfsClient.mkdirp(path);
        this.logger.log(`MFS directory ready: ${path}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`MFS mkdir failed for ${path}: ${message}`);
        throw err;
      }
    }
  }
}
