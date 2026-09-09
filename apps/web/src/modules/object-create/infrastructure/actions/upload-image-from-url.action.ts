'use server';

import { getIpfsContentBaseUrl } from '@/config/get-ipfs-content-base-url';
import { getIpfsGatewayServerBaseUrl } from '@/config/get-ipfs-gateway-server-base-url';
import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from '@/config/ipfs-content-url';

import {
  type FetchImageForImportResult,
  fetchImageForImport,
} from '../fetch-image-for-import.server';
import { getRequestUser } from '@/shared/infrastructure/auth/get-request-user.server';

import {
  type UploadImageToIpfsErrorCode,
  type UploadImageToIpfsResult,
  uploadImageToIpfs,
} from './upload-image.action';

function mapImportFetchError(
  code: Extract<FetchImageForImportResult, { error: string }>['error'],
): UploadImageToIpfsErrorCode {
  if (code === 'invalid_url') {
    return 'invalid_url';
  }
  if (code === 'fetch_failed') {
    return 'service_unavailable';
  }
  return 'upload_failed';
}

export async function uploadImageFromUrl(
  url: string,
): Promise<UploadImageToIpfsResult> {
  const user = await getRequestUser();
  if (!user) {
    return { error: 'unauthorized' };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { error: 'invalid_url' };
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
    return { error: mapImportFetchError(fetched.error) };
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fetched.buffer)], { type: fetched.mime });
  formData.append('file', blob, 'import');

  return uploadImageToIpfs(formData);
}
