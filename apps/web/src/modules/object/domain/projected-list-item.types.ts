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
  /** Viewer has administrative authority on this ref target. */
  hasAdministrativeAuthority?: boolean;
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
