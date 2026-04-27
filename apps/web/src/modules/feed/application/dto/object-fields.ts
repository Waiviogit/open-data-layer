import type { FeedStoryView } from './feed-story.dto';

export type ProjectedObjectView = NonNullable<FeedStoryView['objects']>[number];

/**
 * Keys match `ProjectedObject.fields` from query-api (`updateType` / registry keys).
 * @see apps/query-api/src/domain/object-projection/project-object.ts
 */
export const objectFields = {
  name: (o: ProjectedObjectView): string | undefined => {
    const v = o.fields['name'];
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
  /**
   * `aggregateRating.averageRating` is 0–10000 (rank score mean). Maps to 0–5 for star UI.
   */
  ratingStars01To5: (o: ProjectedObjectView): number | null => {
    const raw = o.fields['aggregateRating'];
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    const avg = (raw as { averageRating?: unknown }).averageRating;
    if (typeof avg !== 'number' || !Number.isFinite(avg)) {
      return null;
    }
    return Math.min(5, Math.max(0, avg / 2000));
  },
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
