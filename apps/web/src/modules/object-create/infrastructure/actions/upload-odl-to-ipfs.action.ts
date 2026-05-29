'use server';

import { getIpfsGatewayServerBaseUrl } from '@/config/get-ipfs-gateway-server-base-url';
import { getBearerAccessToken } from '@/shared/infrastructure/auth/get-bearer-access-token.server';

export type UploadOdlToIpfsResult = { cid: string } | { error: string };

export async function uploadOdlToIpfs(
  odlJson: string,
): Promise<UploadOdlToIpfsResult> {
  const token = await getBearerAccessToken();
  if (!token) {
    return { error: 'unauthorized' };
  }

  const uploadBase = getIpfsGatewayServerBaseUrl();
  const res = await fetch(
    `${uploadBase}/ipfs-gateway/upload/file?filename=odl-batch.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
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
