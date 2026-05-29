import 'server-only';

import {
  IMPORT_IMAGE_MAX_BYTES,
  isAllowedImageImportUrl,
  resolveImageMimeForImport,
} from '../domain/import-image-from-url';

const FETCH_TIMEOUT_MS = 30_000;

export type FetchImageForImportResult =
  | { buffer: Buffer; mime: string }
  | { error: 'invalid_url' | 'fetch_failed' | 'too_large' | 'not_image' };

export async function fetchImageForImport(
  urlString: string,
): Promise<FetchImageForImportResult> {
  const allowed = isAllowedImageImportUrl(urlString);
  if (!allowed.ok) {
    return { error: 'invalid_url' };
  }

  let response: Response;
  try {
    response = await fetch(allowed.url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { error: 'fetch_failed' };
  }

  if (!response.ok) {
    return { error: 'fetch_failed' };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return { error: 'fetch_failed' };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value?.length) {
        continue;
      }
      total += value.length;
      if (total > IMPORT_IMAGE_MAX_BYTES) {
        await reader.cancel();
        return { error: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { error: 'fetch_failed' };
  }

  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  if (!buffer.length) {
    return { error: 'not_image' };
  }

  const mime = resolveImageMimeForImport(
    response.headers.get('content-type'),
    buffer,
  );
  if (!mime) {
    return { error: 'not_image' };
  }

  return { buffer, mime };
}
