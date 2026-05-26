import { DEFAULT_OG_IMAGE_PATH } from './constants';
import { toAbsoluteUrl } from './to-absolute-url';

export function resolveOgImageUrl(
  candidates: ReadonlyArray<string | null | undefined>,
  origin: string | null,
): string | null {
  for (const candidate of candidates) {
    const absolute = toAbsoluteUrl(candidate, origin);
    if (absolute) {
      return absolute;
    }
  }
  return origin ? toAbsoluteUrl(DEFAULT_OG_IMAGE_PATH, origin) : null;
}
