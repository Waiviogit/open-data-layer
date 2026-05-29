'use server';

import { env } from '@/config/env';

export type UploadOdlToIpfsResult = { cid: string } | { error: string };

export async function uploadOdlToIpfs(
  odlJson: string,
): Promise<UploadOdlToIpfsResult> {
  const uploadBase = env.IPFS_GATEWAY_UPLOAD_URL;
  const res = await fetch(
    `${uploadBase}/ipfs-gateway/upload/file?filename=odl-batch.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: odlJson,
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    return { error: 'Upload failed' };
  }
  const data = (await res.json()) as { cid: string };
  const cid = data.cid?.trim();
  if (!cid) {
    return { error: 'Upload failed' };
  }
  return { cid };
}
