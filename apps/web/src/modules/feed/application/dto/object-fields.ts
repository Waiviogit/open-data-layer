import type { FeedStoryView } from './feed-story.dto';

export type ProjectedObjectView = NonNullable<FeedStoryView['objects']>[number];

export type AggregateRatingAspectRow = {
  dimension: string;
  averageRating: number | null;
  userRating: number | null;
  totalVoters: number;
};

function parseAggregateRatingAspects(raw: unknown): AggregateRatingAspectRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AggregateRatingAspectRow[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const dimensionRaw = o.dimension;
    if (typeof dimensionRaw !== 'string') {
      continue;
    }
    const dimension = dimensionRaw.trim();
    if (dimension.length === 0) {
      continue;
    }
    const averageRating =
      typeof o.averageRating === 'number' && Number.isFinite(o.averageRating)
        ? o.averageRating
        : null;
    const userRating =
      typeof o.userRating === 'number' && Number.isFinite(o.userRating)
        ? o.userRating
        : null;
    const tv = o.totalVoters;
    const totalVoters =
      typeof tv === 'number' && Number.isFinite(tv) && tv >= 0 ? Math.floor(tv) : 0;

    out.push({ dimension, averageRating, userRating, totalVoters });
  }
  return out;
}

/**
 * Compact 0–5 star value for feed cards: **mean** of aspect `averageRating` values that are
 * non-null (0–10000 scale → divide by 2000). If no usable averages exist, returns `null`.
 */
function ratingStars01To5Compact(o: ProjectedObjectView): number | null {
  const aspects = parseAggregateRatingAspects(o.fields['aggregateRating']);
  const nums = aspects
    .map((a) => a.averageRating)
    .filter((x): x is number => x !== null && Number.isFinite(x));
  if (nums.length === 0) {
    return null;
  }
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.min(5, Math.max(0, avg / 2000));
}

/**
 * Keys match `ProjectedObject.fields` from query-api (`updateType` / registry keys).
 * @see apps/query-api/src/domain/object-projection/project-object.ts
 */
export const objectFields = {
  name: (o: ProjectedObjectView): string | undefined => {
    const v = o.fields['name'];
    return typeof v === 'string' ? v : undefined;
  },
  /** Distinct from `name`: single-cardinality `title` update on the object. */
  titleUpdate: (o: ProjectedObjectView): string | undefined => {
    const v = o.fields['title'];
    return typeof v === 'string' ? v : undefined;
  },
  image: (o: ProjectedObjectView): string | undefined => {
    const v = o.fields['image'];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  },
  description: (o: ProjectedObjectView): string | undefined => {
    const v = o.fields['description'];
    return typeof v === 'string' ? v : undefined;
  },
  /** Parsed rows from `fields.aggregateRating` (always an array on the wire from query-api). */
  aggregateRatingAspects: (o: ProjectedObjectView): AggregateRatingAspectRow[] => {
    return parseAggregateRatingAspects(o.fields['aggregateRating']);
  },
  ratingStars01To5: ratingStars01To5Compact,
  /** Up to two `tagCategoryItem` value labels for subtitles (projection order). */
  tagCategoryLabels: (o: ProjectedObjectView): string[] => {
    const raw = o.fields['tagCategoryItem'];
    if (!Array.isArray(raw)) {
      return [];
    }
    const labels: string[] = [];
    for (const item of raw) {
      if (item != null && typeof item === 'object' && !Array.isArray(item) && 'value' in item) {
        const v = (item as { value?: unknown }).value;
        if (typeof v === 'string' && v.length > 0) {
          labels.push(v);
        }
      }
    }
    return labels.slice(-2);
  },
} as const;
