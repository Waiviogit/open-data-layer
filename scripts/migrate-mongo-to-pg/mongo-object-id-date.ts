/**
 * Creation time encoded in MongoDB ObjectId (`_id` first 4 bytes = Unix seconds).
 */
import type { MongoId } from './objects/types';

export function mongoOidHex(id: MongoId | undefined): string | null {
  if (id == null) {
    return null;
  }
  if (typeof id === 'string') {
    const t = id.trim();
    return t.length === 24 ? t.toLowerCase() : null;
  }
  const oid = (id as { $oid?: string }).$oid;
  if (typeof oid === 'string' && oid.trim().length === 24) {
    return oid.trim().toLowerCase();
  }
  return null;
}

export function dateFromMongoObjectIdHex(hex: string | null): Date | null {
  if (hex == null || hex.length !== 24) {
    return null;
  }
  const seconds = Number.parseInt(hex.slice(0, 8), 16);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return new Date(seconds * 1000);
}
