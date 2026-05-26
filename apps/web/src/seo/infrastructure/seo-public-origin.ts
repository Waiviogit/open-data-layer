import 'server-only';

import { env } from '@/config/env';

export function seoPublicOrigin(): string | null {
  return env.publicOrigin ?? null;
}
