'use server';

import { getIpfsGatewayServerBaseUrl } from '@/config/get-ipfs-gateway-server-base-url';
import { getIpfsContentBaseUrl } from '@/config/get-ipfs-content-base-url';
import { imageContentUrlForCid } from '@/config/ipfs-content-url';
import { getBearerAccessToken } from '@/shared/infrastructure/auth/get-bearer-access-token.server';

export type UploadImageToIpfsResult =
  | { cid: string; previewUrl: string }
  | { error: string };

export async function uploadImageToIpfs(
  formData: FormData,
): Promise<UploadImageToIpfsResult> {
  const token = await getBearerAccessToken();
  if (!token) {
    return { error: 'unauthorized' };
  }

  const uploadBase = getIpfsGatewayServerBaseUrl();
  const res = await fetch(`${uploadBase}/ipfs-gateway/upload/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    return { error: 'Upload failed' };
  }
  const data = (await res.json()) as { cid: string };
  const cid = data.cid?.trim();
  if (!cid) {
    return { error: 'Upload failed' };
  }
  const contentBase = getIpfsContentBaseUrl() || uploadBase;
  const previewUrl = imageContentUrlForCid(contentBase, cid);
  return { cid, previewUrl };
}
