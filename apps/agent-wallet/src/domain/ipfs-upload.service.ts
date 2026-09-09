import { stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AgentWalletConfig } from '../config/agent-wallet.config';
import {
  IPFS_UPLOAD_FIELD_NAME,
  IPFS_UPLOAD_FILE_MAX_BYTES,
  IPFS_UPLOAD_MAX_BYTES,
} from '../constants/ipfs-upload';
import { mimeFromImageExtension } from '../utils/image-mime';
import {
  buildWaivioIpfsGatewayBaseUrl,
  imageContentUrlForCid,
} from '../utils/waivio-api-urls';
import { WaivioAuthSessionService } from './waivio-auth-session.service';

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.avif',
  '.tif',
  '.tiff',
]);

export type IpfsUploadResult = {
  cid: string;
  contentUrl: string;
  url?: string;
};

@Injectable()
export class IpfsUploadService {
  constructor(
    private readonly config: ConfigService<AgentWalletConfig, true>,
    private readonly waivioAuth: WaivioAuthSessionService,
  ) {}

  async uploadFile(input: {
    filePath?: string;
    content?: string;
    filename?: string;
    account?: string;
  }): Promise<IpfsUploadResult> {
    const hasPath = Boolean(input.filePath?.trim());
    const hasContent = input.content !== undefined;
    if (hasPath === hasContent) {
      throw new Error('Provide exactly one of filePath or content');
    }

    let body: Buffer;
    let filename: string;

    if (hasPath) {
      const resolvedPath = input.filePath!.trim();
      let fileStat;
      try {
        fileStat = await stat(resolvedPath);
      } catch {
        throw new Error(`File not found: ${resolvedPath}`);
      }
      if (!fileStat.isFile()) {
        throw new Error(`Path is not a file: ${resolvedPath}`);
      }
      if (fileStat.size > IPFS_UPLOAD_FILE_MAX_BYTES) {
        throw new Error(
          `File exceeds ${IPFS_UPLOAD_FILE_MAX_BYTES / (1024 * 1024)} MiB limit`,
        );
      }
      body = await import('node:fs/promises').then((fs) =>
        fs.readFile(resolvedPath),
      );
      filename = input.filename?.trim() || basename(resolvedPath);
    } else {
      body = Buffer.from(input.content!, 'utf8');
      if (body.length > IPFS_UPLOAD_FILE_MAX_BYTES) {
        throw new Error(
          `Content exceeds ${IPFS_UPLOAD_FILE_MAX_BYTES / (1024 * 1024)} MiB limit`,
        );
      }
      filename = input.filename?.trim() || 'upload.bin';
    }

    return this.uploadRawFile(body, filename, input.account);
  }

  async uploadImage(filePath: string, account?: string): Promise<IpfsUploadResult> {
    const resolvedPath = filePath.trim();
    if (!resolvedPath) {
      throw new Error('filePath is required');
    }

    let fileStat;
    try {
      fileStat = await stat(resolvedPath);
    } catch {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }

    if (!fileStat.isFile()) {
      throw new Error(`Path is not a file: ${resolvedPath}`);
    }

    if (fileStat.size > IPFS_UPLOAD_MAX_BYTES) {
      throw new Error(
        `Image exceeds ${IPFS_UPLOAD_MAX_BYTES / (1024 * 1024)} MiB limit`,
      );
    }

    const extension = extname(resolvedPath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported image type: ${extension || '(none)'}`);
    }

    const mime = mimeFromImageExtension(extension);
    if (!mime) {
      throw new Error(`Unsupported image type: ${extension || '(none)'}`);
    }

    const fileBuffer = await import('node:fs/promises').then((fs) =>
      fs.readFile(resolvedPath),
    );

    return this.uploadBuffer(fileBuffer, basename(resolvedPath), mime, account);
  }

  private waivioApiOrigin(): string {
    return this.config.get('waivioApiOrigin', { infer: true });
  }

  private async uploadRawFile(
    body: Buffer,
    filename: string,
    account?: string,
    allowRetry = true,
  ): Promise<IpfsUploadResult> {
    const accessToken = await this.waivioAuth.getAccessToken(account);
    const origin = this.waivioApiOrigin();
    const safeName = filename.replace(/[^\w.-]/g, '_');
    const uploadUrl = `${buildWaivioIpfsGatewayBaseUrl(origin)}/upload/file?filename=${encodeURIComponent(safeName)}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(body),
    });

    if (response.status === 401 && allowRetry) {
      await this.waivioAuth.getAccessToken(account, true);
      return this.uploadRawFile(body, filename, account, false);
    }

    if (response.status === 413) {
      throw new Error('File too large for gateway');
    }
    if (!response.ok) {
      const detail = await this.readErrorBody(response);
      throw new Error(
        detail
          ? `IPFS file upload failed (${response.status}): ${detail}`
          : `IPFS file upload failed (${response.status})`,
      );
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new Error('IPFS upload returned invalid JSON');
    }

    const cid =
      typeof parsed === 'object' &&
      parsed !== null &&
      'cid' in parsed &&
      typeof (parsed as { cid?: unknown }).cid === 'string'
        ? (parsed as { cid: string }).cid.trim()
        : '';

    if (!cid) {
      throw new Error('IPFS upload response missing cid');
    }

    const gatewayUrl =
      typeof parsed === 'object' &&
      parsed !== null &&
      'url' in parsed &&
      typeof (parsed as { url?: unknown }).url === 'string'
        ? (parsed as { url: string }).url
        : undefined;

    return {
      cid,
      contentUrl: `${buildWaivioIpfsGatewayBaseUrl(origin)}/files/${cid}`,
      ...(gatewayUrl ? { url: gatewayUrl } : {}),
    };
  }

  private async uploadBuffer(
    fileBuffer: Buffer,
    filename: string,
    mime: string,
    account?: string,
    allowRetry = true,
  ): Promise<IpfsUploadResult> {
    const accessToken = await this.waivioAuth.getAccessToken(account);
    const origin = this.waivioApiOrigin();
    const uploadUrl = `${buildWaivioIpfsGatewayBaseUrl(origin)}/upload/image`;

    const form = new FormData();
    form.append(
      IPFS_UPLOAD_FIELD_NAME,
      new Blob([new Uint8Array(fileBuffer)], { type: mime }),
      filename,
    );

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (response.status === 401 && allowRetry) {
      await this.waivioAuth.getAccessToken(account, true);
      return this.uploadBuffer(fileBuffer, filename, mime, account, false);
    }

    if (response.status === 400) {
      const detail = await this.readErrorBody(response);
      throw new Error(
        detail ? `Invalid image upload: ${detail}` : 'Invalid image upload',
      );
    }
    if (response.status === 413) {
      throw new Error('Image too large for gateway');
    }
    if (!response.ok) {
      const detail = await this.readErrorBody(response);
      throw new Error(
        detail
          ? `IPFS upload failed (${response.status}): ${detail}`
          : `IPFS upload failed (${response.status})`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('IPFS upload returned invalid JSON');
    }

    const cid =
      typeof body === 'object' &&
      body !== null &&
      'cid' in body &&
      typeof (body as { cid?: unknown }).cid === 'string'
        ? (body as { cid: string }).cid.trim()
        : '';

    if (!cid) {
      throw new Error('IPFS upload response missing cid');
    }

    const gatewayUrl =
      typeof body === 'object' &&
      body !== null &&
      'url' in body &&
      typeof (body as { url?: unknown }).url === 'string'
        ? (body as { url: string }).url
        : undefined;

    return {
      cid,
      contentUrl: imageContentUrlForCid(origin, cid),
      ...(gatewayUrl ? { url: gatewayUrl } : {}),
    };
  }

  private async readErrorBody(response: Response): Promise<string | null> {
    try {
      const text = (await response.text()).trim();
      if (!text) {
        return null;
      }
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === 'string') {
          return json.message;
        }
        if (Array.isArray(json.message)) {
          return json.message.join(', ');
        }
      } catch {
        // not JSON
      }
      return text.length > 200 ? `${text.slice(0, 200)}…` : text;
    } catch {
      return null;
    }
  }
}
