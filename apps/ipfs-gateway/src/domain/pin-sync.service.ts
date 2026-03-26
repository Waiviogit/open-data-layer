import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IpfsClient } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';

const SYNC_NAMESPACES = [
  { key: 'images' as const, mfsPath: MFS_NAMESPACE.IMAGES },
  { key: 'json' as const, mfsPath: MFS_NAMESPACE.JSON },
];

interface NamespaceCidResponse {
  namespace: string;
  cid: string;
}

@Injectable()
export class PinSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PinSyncService.name);
  private intervalHandle: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const urls = this.config.get<string[]>('peers.urls', []);
    const intervalMs = this.config.get<number>('peers.syncIntervalMs', 300_000);

    if (urls.length === 0) {
      this.logger.log('Pin sync disabled (IPFS_PEER_URLS empty or unset)');
      return;
    }

    this.logger.log(
      `Pin sync enabled: ${urls.length} peer(s), interval ${intervalMs}ms`,
    );

    await this.runSyncCycle();

    this.intervalHandle = setInterval(() => {
      void this.runSyncCycle();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle !== undefined) {
      clearInterval(this.intervalHandle);
    }
  }

  private async fetchRemoteNamespaceCid(
    peerBaseUrl: string,
    namespaceKey: string,
  ): Promise<string | null> {
    const base = peerBaseUrl.replace(/\/$/, '');
    const url = `${base}/namespaces/${namespaceKey}/cid`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        this.logger.warn(`Peer ${url} returned ${res.status}`);
        return null;
      }
      const body = (await res.json()) as NamespaceCidResponse;
      if (!body?.cid?.trim()) {
        return null;
      }
      return body.cid.trim();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Peer fetch failed ${url}: ${message}`);
      return null;
    }
  }

  private async resolveRemoteCid(namespaceKey: string): Promise<string | null> {
    const urls = this.config.get<string[]>('peers.urls', []);
    for (const peer of urls) {
      const cid = await this.fetchRemoteNamespaceCid(peer, namespaceKey);
      if (cid) {
        return cid;
      }
    }
    return null;
  }

  private async runSyncCycle(): Promise<void> {
    const urls = this.config.get<string[]>('peers.urls', []);
    if (urls.length === 0) {
      return;
    }

    for (const { key, mfsPath } of SYNC_NAMESPACES) {
      try {
        const remoteCid = await this.resolveRemoteCid(key);
        if (!remoteCid) {
          this.logger.warn(
            `Pin sync: no remote CID for namespace "${key}" from any peer`,
          );
          continue;
        }

        let localCid: string;
        try {
          localCid = await this.ipfsClient.filesStat(mfsPath);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Pin sync: local files/stat failed for ${mfsPath}: ${message}`,
          );
          continue;
        }

        if (localCid === remoteCid) {
          this.logger.debug(`Pin sync: namespace "${key}" already up to date`);
          continue;
        }

        this.logger.log(
          `Pin sync: pinning remote ${key} CID ${remoteCid} (local was ${localCid})`,
        );
        await this.ipfsClient.pinAdd(remoteCid, true);
        this.logger.log(`Pin sync: completed pin for namespace "${key}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Pin sync failed for namespace "${key}": ${message}`);
      }
    }
  }
}
