import type { ProjectedMenuItem } from './projected-menu-item.types';
import type { ProjectedListItem, ProjectedSortCustom } from './projected-list-item.types';
import type { ObjectDefaultLanding } from './resolve-object-default-landing';

/** Logical switcher kinds aligned with legacy `wobj-switcher-by-type.md`. */
export type ObjectSwitcherKind =
  | 'list'
  | 'page'
  | 'skill'
  | 'newsfeed'
  | 'widget'
  | 'webpage'
  | 'map'
  | 'shop'
  | 'group'
  | 'default';

export type ObjectRefCardView = {
  objectId: string;
  title: string;
  imageSrc: string | null;
  objectType: string;
};

/** @deprecated Use {@link ObjectRefCardView} for related/similar/add-on rails. */
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

/** Supervised vs exclusive under object Ownership tab (`?sub=`). */
export const OWNERSHIP_SUB_VALUES = ['supervised', 'exclusive'] as const;
export type OwnershipSubType = (typeof OWNERSHIP_SUB_VALUES)[number];

/** Followed-by vs favorited-by under object Followers tab (`?sub=`). */
export const FOLLOWERS_SUB_VALUES = ['followed', 'favorited'] as const;
export type FollowersSubType = (typeof FOLLOWERS_SUB_VALUES)[number];

/** @deprecated Use {@link OwnershipSubType} */
export type AuthoritySubType = OwnershipSubType;

/** @deprecated Use {@link OWNERSHIP_SUB_VALUES} */
export const AUTHORITY_SUB_VALUES = OWNERSHIP_SUB_VALUES;

/** Posts / Threads / Activity row under Reviews. */
export const REVIEWS_FEED_SUB_VALUES = ['posts', 'threads', 'activity'] as const;
export type ReviewsFeedSubType = (typeof REVIEWS_FEED_SUB_VALUES)[number];

/** Posts / Threads / Activity row under Reviews (mock-only). */
export type ObjectFeedSubTabView = {
  segment: string;
  /** Display label from API or mock — not an i18n key. */
  label: string;
};

/** Parsed `widget` update JSON for embed rendering. */
export type ProjectedWidgetConfigView = {
  column: string;
  type: string;
  content: string;
  title?: string;
};

/** Center-column nested view entry (list/page stack). */
export type ObjectNestedViewEntry = {
  objectId: string;
  name: string;
  objectType: ObjectSwitcherKind;
  listItems: ProjectedListItem[];
  /** Raw `sortCustom` for client-side catalog sort override. */
  listItemsSortCustom: ProjectedSortCustom | null;
  pageContentHtml: string | null;
  widgetConfig: ProjectedWidgetConfigView | null;
  pending: boolean;
};

/** Resolved nested entry without pending flag (SSR / server action). */
export type ObjectNestedViewResolved = Omit<ObjectNestedViewEntry, 'pending'>;

/** Resolved gallery photo for carousel and description page. */
export type ProjectedGalleryPhotoView = {
  /** Display URL (resolved from cid when the source update is IPFS-only). */
  url: string;
  /** Canonical IPFS CID when the source update stored cid (omitted for url-only items). */
  cid?: string;
  rankScore: number | null;
  /** Viewer’s ODL rank vote (0–10000) for this photo’s `update_id`. */
  viewerRank?: number | null;
  isAvatar: boolean;
  update_id?: string;
  /** Virtual Related album: source Hive post author. */
  postAuthor?: string;
  postPermlink?: string;
};

/** Grouped gallery album (legacy `galleryAlbum` + items). */
export type ProjectedGalleryAlbumView = {
  name: string;
  items: ProjectedGalleryPhotoView[];
};

/** Object reference card used in brand/manufacturer/merchant/author/publisher blocks. */
export type ObjectRefItem = {
  objectId: string;
  name: string;
  imageUrl: string | null;
};

export type FeatureListItem = {
  key: string;
  value: string;
};

/** One selectable variant value within an option category (Color, Size, …). */
export type ObjectOptionValueView = {
  objectId: string;
  category: string;
  value: string;
  position: number;
  image: string | null;
  price: string | null;
  imageUrl: string | null;
};

/** Ordered blocks for the left rail (legacy `ObjectInfo` stack). */
export type ObjectLeftRailBlock =
  | {
      kind: 'menuItems';
      headingLabel: string;
      items: ProjectedMenuItem[];
    }
  | {
      kind: 'name';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'title';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'parent';
      headingLabel: string;
      objectId: string;
      name: string;
      imageUrl: string | null;
    }
  | {
      kind: 'description';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'button';
      headingLabel: string;
      items: { title: string; href: string }[];
    }
  | {
      kind: 'rating';
      headingLabel: string;
      aspects: {
        update_id: string;
        dimension: string;
        averageRating01To5: number | null;
        totalVoters: number;
        viewerRating01To5: number | null;
      }[];
    }
  | {
      kind: 'tags';
      headingLabel: string;
      /** Grouped by `tagCategory` × `tagCategoryItem.category`; empty categories omitted. */
      sections: { categoryTitle: string; tags: { value: string; updateId?: string }[] }[];
    }
  | {
      kind: 'gallery';
      headingLabel: string;
      photos: ProjectedGalleryPhotoView[];
    }
  | {
      kind: 'price';
      headingLabel: string;
      text: string;
    }
  | {
      kind: 'options';
      headingLabel: string;
      currentObjectId: string;
      categories: { category: string; values: ObjectOptionValueView[] }[];
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
      latitude?: number;
      longitude?: number;
    }
  | {
      kind: 'websites';
      headingLabel: string;
      entries: { title: string; link: string }[];
    }
  | {
      kind: 'productWeight';
      headingLabel: string;
      value: number;
      /** Empty in edit-mode placeholder when weight is not set yet. */
      unit: string;
    }
  | {
      kind: 'link';
      headingLabel: string;
      items: { iconSrc: string; label: string; href: string }[];
    }
  | {
      kind: 'phones';
      headingLabel: string;
      entries: { value: string; title?: string }[];
    }
  | {
      kind: 'email';
      headingLabel: string;
      address: string;
    }
  | {
      kind: 'walletAddress';
      headingLabel: string;
      items: { iconSrc: string; lineText: string }[];
    }
  | {
      kind: 'identifier';
      headingLabel: string;
      /** From projected `identifier` update (`type` + `value`). */
      rows: { type: string; value: string }[];
    }
  | {
      kind: 'productGroupId';
      headingLabel: string;
      /** From projected `productGroupId` update (single text). */
      text: string;
    }
  | {
      kind: 'image';
      headingLabel: string;
      /** Current avatar URL, or null when not set. */
      url: string | null;
    }
  | {
      kind: 'imageBackground';
      headingLabel: string;
      /** Current background/cover URL, or null when not set. */
      url: string | null;
    }
  | { kind: 'status'; headingLabel: string; status?: string }
  | { kind: 'compareAtPrice'; headingLabel: string }
  | { kind: 'saleEvent'; headingLabel: string }
  | {
      kind: 'size';
      headingLabel: string;
      length: number;
      width: number;
      depth: number;
      /** Empty in edit-mode placeholder when size is not set yet. */
      unit: string;
    }
  | { kind: 'brand'; headingLabel: string; items: ObjectRefItem[] }
  | {
      kind: 'manufacturer';
      headingLabel: string;
      items: ObjectRefItem[];
    }
  | {
      kind: 'merchant';
      headingLabel: string;
      items: ObjectRefItem[];
    }
  | {
      kind: 'featureList';
      headingLabel: string;
      items: FeatureListItem[];
    }
  | { kind: 'license'; headingLabel: string; text: string }
  | { kind: 'compatibility'; headingLabel: string; text: string }
  | {
      kind: 'metadata';
      headingLabel: string;
      items: FeatureListItem[];
    }
  | { kind: 'allowedTools'; headingLabel: string; items: string[] }
  | {
      kind: 'references';
      headingLabel: string;
      items: ObjectRefItem[];
    }
  | { kind: 'category'; headingLabel: string; names: string[] }
  | { kind: 'calories'; headingLabel: string; text: string }
  | { kind: 'budget'; headingLabel: string; text: string }
  | { kind: 'cookTime'; headingLabel: string; text: string }
  | { kind: 'ingredients'; headingLabel: string; items: string[] }
  | { kind: 'nutrition'; headingLabel: string; text: string }
  | {
      kind: 'author';
      headingLabel: string;
      items: ObjectRefItem[];
    }
  | {
      kind: 'publisher';
      headingLabel: string;
      items: ObjectRefItem[];
    }
  | { kind: 'datePublished'; headingLabel: string; text: string }
  | { kind: 'inLanguage'; headingLabel: string; text: string }
  | { kind: 'typicalAgeRange'; headingLabel: string; text: string }
  | { kind: 'printLength'; headingLabel: string; text: string }
  | { kind: 'sortCustom'; headingLabel: string }
  | { kind: 'promotion'; headingLabel: string }
  | { kind: 'pin'; headingLabel: string }
  | { kind: 'remove'; headingLabel: string }
  | { kind: 'delegation'; headingLabel: string }
  | { kind: 'objectControl'; headingLabel: string; text: string }
  | { kind: 'admins'; headingLabel: string; accounts: string[] }
  | { kind: 'moderators'; headingLabel: string; accounts: string[] }
  | { kind: 'trusted'; headingLabel: string; accounts: string[] }
  | { kind: 'authorities'; headingLabel: string; accounts: string[] }
  | { kind: 'whitelist'; headingLabel: string; accounts: string[] }
  | { kind: 'restricted'; headingLabel: string; accounts: string[] }
  | { kind: 'banned'; headingLabel: string; accounts: string[] }
  | {
      kind: 'inheritsFrom';
      headingLabel: string;
      entries: { objectId: string; scope: string[] }[];
    }
  | {
      kind: 'validityCutoff';
      headingLabel: string;
      entries: { account: string; timestamp: number }[];
    };

export type ObjectPageSeoView = {
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  json_ld: Record<string, unknown>;
  keywords: string[] | null;
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
  /** Lifecycle `objects_core.status` from query-api (e.g. `active`, `closed`). */
  lifecycleStatus: string;
  /** Short subtitle under title (e.g. business category). */
  tagline: string | null;
  /** Legacy-style numeric badge label next to type (e.g. weight score). */
  displayWeightLabel: string | null;
  /** Raw `object_type` from query-api / registry key (e.g. `shop`, `place`). */
  objectTypeKey: string;
  objectType: ObjectSwitcherKind;
  /** Default tab/center column on clean `/object/:id` (legacy `defaultShowLink` logic). */
  defaultLanding: ObjectDefaultLanding;
  /** List catalog rows (`listItem` updates), order from `sortCustom` when present. */
  listItems: ProjectedListItem[];
  /** Raw `sortCustom` for client-side catalog sort override. */
  listItemsSortCustom: ProjectedSortCustom | null;
  /** Raw page body (`pageContent` update) for page-type objects. */
  pageContent: string | null;
  /** Raw legal body (`legalText` update) for `legal_document` objects. */
  legalText: string | null;
  /** Raw skill body (`skillContent` update) for `skill` objects. */
  skillContent: string | null;
  /** Parsed `widget` update JSON for widget-type objects. */
  widgetConfig: ProjectedWidgetConfigView | null;
  /** Raw description body (`description` update) for center-column `/description` route. */
  descriptionContent: string | null;
  /** Photos-album preview from query-api (legacy `preview_gallery`). */
  previewGallery: ProjectedGalleryPhotoView[];
  /** Grouped gallery albums for Gallery tab (legacy `galleryAlbum`). */
  galleryAlbums: ProjectedGalleryAlbumView[];
  /** On-chain `imageGallery` album names (for broadcast album ensure). */
  onChainGalleryAlbumNames: string[];
  rating01To5: number | null;
  primaryTabs: ObjectPrimaryTabView[];
  feedSubTabs: ObjectFeedSubTabView[];
  /** Legacy-order left column blocks derived from projected fields. */
  leftRailBlocks: ObjectLeftRailBlock[];
  /** Existing `tagCategory` values on this object (for tag item edit picker). */
  tagCategoryNames: string[];
  rightRelated: ObjectRefCardView[];
  rightSimilar: ObjectRefCardView[];
  rightAddOn: ObjectRefCardView[];
  rightRelatedHasMore: boolean;
  rightSimilarHasMore: boolean;
  rightAddOnHasMore: boolean;
  /** Viewer favorited this object (heart). */
  isFavorited: boolean;
  /** Viewer has supervised ownership on this object. */
  hasSupervisedOwnership: boolean;
  /** Viewer has exclusive ownership on this object. */
  hasExclusiveOwnership: boolean;
  /** Viewer follows this object (`user_object_follows`). */
  isFollowing: boolean;
  /** Viewer bell notifications on this object follow row. */
  viewerBell: boolean;
  /** Count of existing update rows per `update_type` (e.g. `{ menuItem: 12, name: 1 }`). */
  updateTypeCounts: Record<string, number>;
  /** Distinct non-null locales from object update rows (for updates feed filter). */
  updateLocales: string[];
  /** For Followers tab sub-nav badges (`favorited_by_count` from resolve). */
  favoritedByCount: number;
  /** For Ownership tab sub-nav badges (`supervised_count` / `exclusive_count` from resolve). */
  supervisedOwnershipCount: number;
  exclusiveOwnershipCount: number;
  seo: ObjectPageSeoView | null;
};
