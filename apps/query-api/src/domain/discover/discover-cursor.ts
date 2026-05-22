import type { DiscoverSort } from './discover-query.schema';

export type DiscoverObjectCursorPayload = {
  sort: DiscoverSort;
  seq: number;
  weight: number | null;
  object_id: string;
};

export function encodeDiscoverObjectCursor(payload: DiscoverObjectCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeDiscoverObjectCursor(raw: string): DiscoverObjectCursorPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const json = Buffer.from(trimmed, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as DiscoverObjectCursorPayload;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.object_id !== 'string' ||
      typeof parsed.seq !== 'number' ||
      (parsed.sort !== 'newest' && parsed.sort !== 'oldest' && parsed.sort !== 'rank')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export type DiscoverUserCursorPayload = {
  name: string;
  wobjects_weight: number | null;
  followers_count: number;
};

export function encodeDiscoverUserCursor(payload: DiscoverUserCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeDiscoverUserCursor(raw: string): DiscoverUserCursorPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const json = Buffer.from(trimmed, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as DiscoverUserCursorPayload;
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.name !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
