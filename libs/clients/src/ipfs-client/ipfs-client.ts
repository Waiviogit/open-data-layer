import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { IPFS_CLIENT_MODULE_OPTIONS, type IpfsClientModuleOptions } from './ipfs-client.options';

interface AddApiResponse {
  Hash: string;
  Name?: string;
  Size?: string;
}

interface FilesStatResponse {
  Hash: string;
  Size?: number;
  CumulativeSize?: number;
  Type?: string;
}

@Injectable()
export class IpfsClient {
  private readonly logger = new Logger(IpfsClient.name);

  constructor(
    @Inject(IPFS_CLIENT_MODULE_OPTIONS)
    private readonly options: IpfsClientModuleOptions,
  ) {}

  get apiUrl(): string {
    return this.options.apiUrl.replace(/\/$/, '');
  }

  get gatewayUrl(): string | undefined {
    return this.options.gatewayUrl?.replace(/\/$/, '');
  }

  /**
   * Add raw bytes to IPFS and pin.
   */
  async add(
    data: Buffer,
    filename = 'file',
  ): Promise<{ cid: string; url?: string }> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(data)]);
    form.append('file', blob, filename);

    const url = new URL(`${this.apiUrl}/api/v0/add`);
    url.searchParams.set('pin', 'true');

    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS add failed: ${res.status} ${text}`);
      throw new Error(`IPFS add failed: ${res.status}`);
    }

    const json = (await res.json()) as AddApiResponse;
    const cid = json.Hash;
    const gw = this.gatewayUrl;
    return {
      cid,
      url: gw ? `${gw}/ipfs/${cid}` : undefined,
    };
  }

  /**
   * Stream raw bytes to IPFS without buffering.
   * Uses node:http/https directly so backpressure is respected end-to-end —
   * data flows from the source stream into the TCP socket in chunks without
   * ever accumulating in Node.js memory. Suitable for multi-GB files.
   */
  async addStream(
    stream: Readable,
    filename = 'upload.bin',
  ): Promise<{ cid: string; url?: string }> {
    const boundary = `ipfs${randomBytes(16).toString('hex')}`;
    const safeFilename = filename.replace(/"/g, '').replace(/\r|\n/g, '');

    const apiUrl = new URL(`${this.apiUrl}/api/v0/add`);
    apiUrl.searchParams.set('pin', 'true');

    const protocol = apiUrl.protocol === 'https:' ? https : http;

    return new Promise<{ cid: string; url?: string }>((resolve, reject) => {
      const req = protocol.request(
        {
          hostname: apiUrl.hostname,
          port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
          path: apiUrl.pathname + apiUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Transfer-Encoding': 'chunked',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              this.logger.error(`IPFS add (stream) failed: ${res.statusCode} ${data}`);
              reject(new Error(`IPFS add failed: ${res.statusCode}`));
              return;
            }
            try {
              const json = JSON.parse(data) as AddApiResponse;
              const cid = json.Hash;
              const gw = this.gatewayUrl;
              resolve({ cid, url: gw ? `${gw}/ipfs/${cid}` : undefined });
            } catch (e) {
              reject(e);
            }
          });
        },
      );

      req.on('error', reject);

      req.write(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFilename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
        ),
      );

      stream.pipe(req, { end: false });
      stream.on('end', () => {
        req.write(Buffer.from(`\r\n--${boundary}--\r\n`));
        req.end();
      });
      stream.on('error', reject);
    });
  }

  /**
   * Serialize JSON and add to IPFS.
   */
  async addJson(data: unknown): Promise<{ cid: string; url?: string }> {
    const buf = Buffer.from(JSON.stringify(data), 'utf8');
    return this.add(buf, 'data.json');
  }

  /**
   * Read object from IPFS as a Node readable stream.
   */
  async cat(cid: string): Promise<Readable> {
    const url = new URL(`${this.apiUrl}/api/v0/cat`);
    url.searchParams.set('arg', cid);

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS cat failed: ${res.status} ${text}`);
      throw new Error(`IPFS cat failed: ${res.status}`);
    }

    return Readable.fromWeb(res.body as WebReadableStream);
  }

  /**
   * Create MFS directory (and parents). Idempotent when parents=true.
   */
  async mkdirp(path: string): Promise<void> {
    const url = new URL(`${this.apiUrl}/api/v0/files/mkdir`);
    url.searchParams.set('arg', path);
    url.searchParams.set('parents', 'true');

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS files/mkdir failed: ${res.status} ${text}`);
      throw new Error(`IPFS files/mkdir failed: ${res.status}`);
    }
  }

  /**
   * Copy an IPFS object into MFS (e.g. /ipfs/Qm... -> /images/foo.webp).
   */
  async filesCp(cid: string, mfsPath: string): Promise<void> {
    const url = new URL(`${this.apiUrl}/api/v0/files/cp`);
    url.searchParams.append('arg', `/ipfs/${cid}`);
    url.searchParams.append('arg', mfsPath);

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS files/cp failed: ${res.status} ${text}`);
      throw new Error(`IPFS files/cp failed: ${res.status}`);
    }
  }

  /**
   * Stat an MFS path; returns the CID (Hash) of the file or directory.
   */
  async filesStat(mfsPath: string): Promise<string> {
    const url = new URL(`${this.apiUrl}/api/v0/files/stat`);
    url.searchParams.set('arg', mfsPath);

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS files/stat failed: ${res.status} ${text}`);
      throw new Error(`IPFS files/stat failed: ${res.status}`);
    }

    const json = (await res.json()) as FilesStatResponse;
    return json.Hash;
  }

  /**
   * Pin a CID on the local node (optionally recursive for directories).
   */
  async pinAdd(cid: string, recursive = true): Promise<void> {
    const url = new URL(`${this.apiUrl}/api/v0/pin/add`);
    url.searchParams.set('arg', cid);
    url.searchParams.set('recursive', recursive ? 'true' : 'false');

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`IPFS pin/add failed: ${res.status} ${text}`);
      throw new Error(`IPFS pin/add failed: ${res.status}`);
    }
  }
}
