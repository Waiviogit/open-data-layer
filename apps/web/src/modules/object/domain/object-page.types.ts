import type { ProjectedMenuItem } from './projected-menu-item.types';

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

/** Ordered blocks for the left rail (legacy `ObjectInfo` stack). */
export type ObjectLeftRailBlock =
  | {
      kind: 'menuItems';
      headingLabel: string;
      items: ProjectedMenuItem[];
    }
  | {
      kind: 'description';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'rating';
      headingLabel: string;
      rating01To5: number;
      /** Not projected yet — reserved for parity with legacy "(n)". */
      reviewCount?: number;
    }
  | {
      kind: 'tags';
      headingLabel: string;
      labels: string[];
    }
  | {
      kind: 'gallery';
      headingLabel: string;
      urls: string[];
    }
  | {
      kind: 'price';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'workHours';
      headingLabel: string;
      lines: string[];
    }
  | {
      kind: 'address';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'geo';
      headingLabel: string;
      latitude: number;
      longitude: number;
    }
  | {
      kind: 'websites';
      headingLabel: string;
      entries: { title: string; link: string }[];
    }
  | {
      kind: 'phones';
      headingLabel: string;
      numbers: string[];
    }
  | {
      kind: 'email';
      headingLabel: string;
      address: string;
    };

export type ObjectPageViewModel = {
  objectId: string;
  /** Hero heading from `name` update. */
  title: string;
  /** Second line under name from `title` update (when present). */
  subtitleTitle: string | null;
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
  /** Legacy-order left column blocks derived from projected fields. */
  leftRailBlocks: ObjectLeftRailBlock[];
  rightFeatured: ObjectSidebarMiniCardView[];
  rightRelated: ObjectSidebarMiniCardView[];
  rightSimilar: ObjectSidebarMiniCardView[];
};
