'use server';

import { getIpfsContentBaseUrl } from '@/config/get-ipfs-content-base-url';
import { getIpfsGatewayServerBaseUrl } from '@/config/get-ipfs-gateway-server-base-url';
import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from '@/config/ipfs-content-url';

import { fetchImageForImport } from '../fetch-image-for-import.server';
import {
  type UploadImageToIpfsResult,
  uploadImageToIpfs,
} from './upload-image.action';

export async function uploadImageFromUrl(
  url: string,
): Promise<UploadImageToIpfsResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { error: 'Invalid URL' };
  }

  const gatewayCid = extractCidFromContentGatewayUrl(trimmed);
  if (gatewayCid) {
    const contentBase = getIpfsContentBaseUrl() || getIpfsGatewayServerBaseUrl();
    return {
      cid: gatewayCid,
      previewUrl: imageContentUrlForCid(contentBase, gatewayCid),
    };
  }

  const fetched = await fetchImageForImport(trimmed);
  if ('error' in fetched) {
    return { error: fetched.error };
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fetched.buffer)], { type: fetched.mime });
  formData.append('file', blob, 'import');

  return uploadImageToIpfs(formData);
}
