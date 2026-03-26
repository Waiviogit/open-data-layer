import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { IpfsClient } from '@opden-data-layer/clients';

@Injectable()
export class GatewayReadService {
  private readonly logger = new Logger(GatewayReadService.name);

  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly config: ConfigService,
  ) {}

  /**
   * Read by CID from local Kubo first; on failure, try peer gateways sequentially.
   */
  async readFile(cid: string): Promise<Readable> {
    let localError: Error | undefined;
    try {
      return await this.ipfsClient.cat(cid);
    } catch (err) {
      localError = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        `Local IPFS cat failed for ${cid}: ${localError.message}`,
      );
    }

    const peers = this.config.get<string[]>('peers.urls', []);
    if (peers.length === 0) {
      throw localError;
    }

    for (const peerBase of peers) {
      const base = peerBase.replace(/\/$/, '');
      const url = `${base}/files/${encodeURIComponent(cid)}`;
      try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          this.logger.warn(`Peer ${url} returned ${res.status} ${text}`);
          continue;
        }
        return Readable.fromWeb(res.body as WebReadableStream);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Peer fetch failed ${url}: ${message}`);
      }
    }

    throw localError;
  }
}
