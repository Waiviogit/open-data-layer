'use server';

import { env } from '@/config/env';

export type UploadImageToIpfsResult =
  | { cid: string; previewUrl: string }
  | { error: string };

export async function uploadImageToIpfs(
  formData: FormData,
): Promise<UploadImageToIpfsResult> {
  const uploadBase = env.IPFS_GATEWAY_UPLOAD_URL;
  const res = await fetch(`${uploadBase}/ipfs-gateway/upload/image`, {
    method: 'POST',
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
  const contentBase = env.IPFS_CONTENT_BASE_URL ?? uploadBase;
  const previewUrl = `${contentBase}/ipfs-gateway/content/image/${cid}`;
  return { cid, previewUrl };
}
