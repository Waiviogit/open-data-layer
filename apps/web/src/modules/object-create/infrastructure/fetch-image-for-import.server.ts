import 'server-only';

import {
  IMAGE_IMPORT_MAX_REDIRECTS,
  IMPORT_IMAGE_MAX_BYTES,
  isAllowedImageImportUrlAsync,
  resolveImageMimeForImport,
} from '../domain/import-image-from-url';

const FETCH_TIMEOUT_MS = 30_000;

export type FetchImageForImportResult =
  | { buffer: Buffer; mime: string }
  | { error: 'invalid_url' | 'fetch_failed' | 'too_large' | 'not_image' };

type FetchImageImportFetchError = Extract<
  FetchImageForImportResult,
  { error: string }
>['error'];

async function fetchImageImportResponse(
  startUrlString: string,
): Promise<Response | { error: FetchImageImportFetchError }> {
  const initial = await isAllowedImageImportUrlAsync(startUrlString);
  if (!initial.ok) {
    return { error: 'invalid_url' };
  }

  let current = initial.url;

  for (let hop = 0; hop <= IMAGE_IMPORT_MAX_REDIRECTS; hop++) {
    if (hop > 0) {
      const allowed = await isAllowedImageImportUrlAsync(current.toString());
      if (!allowed.ok) {
        return { error: 'invalid_url' };
      }
      current = allowed.url;
    }

    let response: Response;
    try {
      response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return { error: 'fetch_failed' };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { error: 'fetch_failed' };
      }
      try {
        current = new URL(location, current);
      } catch {
        return { error: 'invalid_url' };
      }
      continue;
    }

    if (!response.ok) {
      return { error: 'fetch_failed' };
    }

    return response;
  }

  return { error: 'fetch_failed' };
}

export async function fetchImageForImport(
  urlString: string,
): Promise<FetchImageForImportResult> {
  const responseOrError = await fetchImageImportResponse(urlString);
  if (!(responseOrError instanceof Response)) {
    return responseOrError;
  }
  const response = responseOrError;

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
