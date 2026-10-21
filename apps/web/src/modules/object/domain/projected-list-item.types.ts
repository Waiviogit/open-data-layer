import type { AffiliateLinkView } from '@/modules/feed/application/dto/feed-story.dto';

/** One row from projected `listItem` updates (expanded object_ref). */
export type ProjectedListItem = {
  objectId: string;
  objectType: string;
  name: string;
  imageUrl: string | null;
  /** Target object weight from `objects_core` (legacy catalog `rank` sort). */
  weight: number | null;
  /** Unix seconds when this ref was added on the parent list (`listItem` update). */
  addedAtUnix?: number | null;
  /** Direct `listItem` update count; present for list-type refs from query-api. */
  listItemsCount?: number;
  /** Excerpt from projected `description` update. */
  description?: string | null;
  /** Up to two `tagCategoryItem` value labels for card subtitles. */
  tagCategoryLabels?: string[];
  /** Parsed from projected `aggregateRating` on ref summaries. */
  aggregateRatingAspects?: ProjectedListItemRatingAspect[];
  /** Viewer favorited this ref target. */
  isFavorited?: boolean;
  /** Localized price string from projected `price` update. */
  price?: string | null;
  /** Display title tagline from projected `title` update. */
  title?: string | null;
  /** Structured address update payload or string. */
  address?: unknown | null;
  /** Geo coordinates from projected `geo` update. */
  geo?: unknown | null;
  /** Compact brand ref from projected `brand` update (first when multi). */
  brandRef?: ProjectedListItemRef | null;
  /** Compact parent ref from projected `parent` update. */
  parentRef?: ProjectedListItemRef | null;
  /** Parent `listItem` update id — used for catalog reject votes. */
  listItemUpdateId?: string;
  /** Computed merchant affiliate URLs from query-api (root of the ref summary). */
  affiliateLinks?: AffiliateLinkView[];
};

/** Nested object_ref row on a list-item ref summary. */
export type ProjectedListItemRef = {
  objectId: string;
  objectType: string;
  name: string;
  imageUrl: string | null;
};

export type ProjectedListItemRatingAspect = {
  update_id: string | null;
  dimension: string;
  averageRating: number | null;
  userRating: number | null;
  totalVoters: number;
};

/** Legacy catalog sort modes (`CatalogWrap` / `sortListItemsBy`). */
export type CatalogListSortType =
  | 'rank'
  | 'by-name-asc'
  | 'by-name-desc'
  | 'recency'
  | 'reverse_recency';

/** Custom menu ordering (`sortCustom` update). */
export type ProjectedSortCustom = {
  include: string[];
  exclude: string[];
  /** Legacy `sortCustom.sortType`; when absent, `include` non-empty → custom, else rank. */
  sortType?: CatalogListSortType | 'custom';
};
