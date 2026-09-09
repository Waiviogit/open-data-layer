'use server';

import { getIpfsGatewayServerBaseUrl } from '@/config/get-ipfs-gateway-server-base-url';
import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from '@/config/ipfs-content-url';
import { getRequestUser } from '@/shared/infrastructure/auth/get-request-user.server';
import { safeFetch } from '@/shared/infrastructure/http/safe-fetch.server';

import {
  IMPORT_IMAGE_MAX_BYTES,
  resolveImageMimeForImport,
} from '../../domain/import-image-from-url';
import { fetchImageForImport } from '../fetch-image-for-import.server';

export type FetchImageForEditorErrorCode =
  | 'unauthorized'
  | 'invalid_cid'
  | 'invalid_url'
  | 'fetch_failed'
  | 'too_large'
  | 'not_image';

export type FetchImageForEditorResult =
  | { base64: string; mime: string }
  | { error: FetchImageForEditorErrorCode };

function isPlausibleIpfsCid(cid: string): boolean {
  if (cid.length < 10 || cid.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9]+$/.test(cid);
}

async function fetchGatewayImageByCid(
  cid: string,
): Promise<FetchImageForEditorResult> {
  if (!isPlausibleIpfsCid(cid)) {
    return { error: 'invalid_cid' };
  }

  const url = imageContentUrlForCid(getIpfsGatewayServerBaseUrl(), cid);
  const fetched = await safeFetch(url, {
    method: 'GET',
    headers: { Accept: 'image/*' },
  });
  if (!fetched.ok) {
    return { error: 'fetch_failed' };
  }

  const res = fetched.response;
  let buffer: Buffer;
  try {
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > IMPORT_IMAGE_MAX_BYTES) {
      return { error: 'too_large' };
    }
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return { error: 'fetch_failed' };
  }

  if (!buffer.length) {
    return { error: 'not_image' };
  }

  const mime = resolveImageMimeForImport(
    res.headers.get('content-type'),
    buffer,
  );
  if (!mime) {
    return { error: 'not_image' };
  }

  return { base64: buffer.toString('base64'), mime };
}

/** Server-side image bytes for the crop editor (avoids canvas CORS on gateway URLs). */
export async function fetchImageForEditor(
  url: string,
  cid?: string,
): Promise<FetchImageForEditorResult> {
  const user = await getRequestUser();
  if (!user) {
    return { error: 'unauthorized' };
  }

  const trimmedUrl = url.trim();
  const trimmedCid = cid?.trim() ?? '';
  const gatewayCid =
    (trimmedCid && isPlausibleIpfsCid(trimmedCid) ? trimmedCid : null) ??
    (trimmedUrl ? extractCidFromContentGatewayUrl(trimmedUrl) : null);

  if (gatewayCid) {
    return fetchGatewayImageByCid(gatewayCid);
  }

  if (!trimmedUrl) {
    return { error: 'invalid_url' };
  }

  const fetched = await fetchImageForImport(trimmedUrl);
  if ('error' in fetched) {
    return { error: fetched.error };
  }

  return {
    base64: fetched.buffer.toString('base64'),
    mime: fetched.mime,
  };
}
