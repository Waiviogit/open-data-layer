import type { AffiliateEnrichTarget } from './affiliate.types';

function isRefSummary(value: unknown): value is AffiliateEnrichTarget {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.object_id === 'string' &&
    typeof row.object_type === 'string' &&
    row.fields != null &&
    typeof row.fields === 'object' &&
    !Array.isArray(row.fields)
  );
}

/**
 * Parent objects plus one level of nested RefSummary (e.g. listItem children).
 * Grandchildren are not collected.
 */
export function flattenAffiliateTargets(
  objects: AffiliateEnrichTarget[],
): AffiliateEnrichTarget[] {
  const out: AffiliateEnrichTarget[] = [];
  const seen = new Set<string>();

  const push = (target: AffiliateEnrichTarget) => {
    if (seen.has(target.object_id)) {
      return;
    }
    seen.add(target.object_id);
    out.push(target);
  };

  for (const object of objects) {
    push(object);
    if (object.fields == null || typeof object.fields !== 'object') {
      continue;
    }
    for (const value of Object.values(object.fields)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isRefSummary(item)) {
            push(item);
          }
        }
      } else if (isRefSummary(value)) {
        push(value);
      }
    }
  }

  return out;
}
