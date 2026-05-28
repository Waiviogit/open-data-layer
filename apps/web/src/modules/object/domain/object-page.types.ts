import type { ProjectedMenuItem } from './projected-menu-item.types';
import type { ProjectedListItem, ProjectedSortCustom } from './projected-list-item.types';
import type { ObjectDefaultLanding } from './resolve-object-default-landing';

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

/** Administrative vs ownership under object Authority tab (`?sub=`). */
export const AUTHORITY_SUB_VALUES = ['administrative', 'ownership'] as const;
export type AuthoritySubType = (typeof AUTHORITY_SUB_VALUES)[number];

/** Posts / Threads row under Reviews (mock-only). */
export type ObjectFeedSubTabView = {
  segment: string;
  /** Display label from API or mock — not an i18n key. */
  label: string;
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
  pending: boolean;
};

/** Resolved nested entry without pending flag (SSR / server action). */
export type ObjectNestedViewResolved = Omit<ObjectNestedViewEntry, 'pending'>;

/** Resolved gallery photo for carousel and description page. */
export type ProjectedGalleryPhotoView = {
  url: string;
  rankScore: number | null;
  isAvatar: boolean;
  update_id?: string;
};

/** Grouped gallery album (legacy `galleryAlbum` + items). */
export type ProjectedGalleryAlbumView = {
  name: string;
  items: ProjectedGalleryPhotoView[];
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
      sections: { categoryTitle: string; values: string[] }[];
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
      kind: 'link';
      headingLabel: string;
      /** Icon + visible platform label (inactive; URLs not shown until actions land). */
      items: { iconSrc: string; label: string }[];
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
  /** Raw description body (`description` update) for center-column `/description` route. */
  descriptionContent: string | null;
  /** Photos-album preview from query-api (legacy `preview_gallery`). */
  previewGallery: ProjectedGalleryPhotoView[];
  /** Grouped gallery albums for Gallery tab (legacy `galleryAlbum`). */
  galleryAlbums: ProjectedGalleryAlbumView[];
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
  /** Viewer has administrative authority on this object (favorites heart). */
  hasAdministrativeAuthority: boolean;
  /** Viewer has ownership authority on this object. */
  hasOwnershipAuthority: boolean;
  /** Viewer follows this object (`user_object_follows`). */
  isFollowing: boolean;
  /** Viewer bell notifications on this object follow row. */
  viewerBell: boolean;
  /** Count of existing update rows per `update_type` (e.g. `{ menuItem: 12, name: 1 }`). */
  updateTypeCounts: Record<string, number>;
  /** For Authority tab sub-nav badges (`object_authority` counts from resolve). */
  administrativeAuthorityCount: number;
  ownershipAuthorityCount: number;
  seo: ObjectPageSeoView | null;
};
