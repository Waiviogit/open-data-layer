/** Logical switcher kinds aligned with legacy `wobj-switcher-by-type.md`. */
export type ObjectSwitcherKind =
  | 'list'
  | 'page'
  | 'newsfeed'
  | 'widget'
  | 'webpage'
  | 'map'
  | 'shop'
  | 'group'
  | 'default';

export type ObjectSidebarMiniCardView = {
  id: string;
  title: string;
  imageSrc?: string | null;
};

/** Horizontal tabs under hero (Reviews, Gallery, …). */
export type ObjectPrimaryTabView = {
  segment: string;
  /** Display label from API or mock — not an i18n key. */
  label: string;
  count?: number;
};

/** Posts / Threads row under Reviews (mock-only). */
export type ObjectFeedSubTabView = {
  segment: string;
  /** Display label from API or mock — not an i18n key. */
  label: string;
};

/** Static left-column blocks (About, ratings recap, gallery thumbs, hours). */
export type ObjectAboutPanelView = {
  introParagraph: string;
  prosTags?: string[];
  galleryThumbUrls?: string[];
  hoursLines?: string[];
  /** Review count shown next to overall rating (e.g. 2 → "(2)"). */
  overallReviewCount?: number;
};

export type ObjectPageViewModel = {
  objectId: string;
  title: string;
  /** Resolved image URL or null → placeholder */
  avatarUrl: string | null;
  /** Optional hero cover image URL */
  coverImageUrl: string | null;
  /** Badge next to title (e.g. Shop) — plain text from API or mock. */
  kindLabel: string;
  /** Short subtitle under title (e.g. business category). */
  tagline: string | null;
  /** Legacy-style numeric badge label next to type (e.g. weight score). */
  displayWeightLabel: string | null;
  objectType: ObjectSwitcherKind;
  rating01To5: number | null;
  primaryTabs: ObjectPrimaryTabView[];
  feedSubTabs: ObjectFeedSubTabView[];
  aboutPanel: ObjectAboutPanelView;
  rightFeatured: ObjectSidebarMiniCardView[];
  rightRelated: ObjectSidebarMiniCardView[];
  rightSimilar: ObjectSidebarMiniCardView[];
};
