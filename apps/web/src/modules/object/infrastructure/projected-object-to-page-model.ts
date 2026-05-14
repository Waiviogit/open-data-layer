import {
  objectFields,
  type ProjectedObjectView,
} from '@/modules/feed/application/dto/object-fields';

import { ABOUT_SECTION_BLOCK_ORDER, MENU_BLOCK_ID } from '../domain/object-left-rail-order';
import type {
  ObjectFeedSubTabView,
  ObjectLeftRailBlock,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSidebarMiniCardView,
  ObjectSwitcherKind,
} from '../domain/object-page.types';
import { OBJECT_LEFT_RAIL_BLOCK_LABEL } from '../domain/object-update-labels';

import type { ProjectedObjectWithCountsView } from './object-resolve.types';
import {
  applySortCustomToMenuItems,
  projectedAddressDisplayLine,
  projectedEmail,
  projectedGalleryImageUrls,
  projectedGeoLatLon,
  projectedMenuItems,
  projectedPrice,
  projectedSortCustom,
  projectedTagCategoryItemValues,
  projectedTagCategoryNames,
  projectedTelephones,
  projectedWebsiteEntries,
  projectedWorkHours,
} from './object-projected-fields';

/** Thousandths precision for hero weight badge (matches Waivio-style display). */
const OBJECT_WEIGHT_DISPLAY_MAX_FRACTION_DIGITS = 3;

function formatObjectWeightForDisplay(weight: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: OBJECT_WEIGHT_DISPLAY_MAX_FRACTION_DIGITS,
  }).format(weight);
}

const SWITCHER_KINDS = new Set<ObjectSwitcherKind>([
  'list',
  'page',
  'newsfeed',
  'widget',
  'webpage',
  'map',
  'shop',
  'group',
  'default',
]);

function toSwitcherKind(objectType: string): ObjectSwitcherKind {
  return SWITCHER_KINDS.has(objectType as ObjectSwitcherKind)
    ? (objectType as ObjectSwitcherKind)
    : 'default';
}

/** Fallback label when `object_type` from API is empty. */
function kindLabelFallback(switcher: ObjectSwitcherKind): string {
  switch (switcher) {
    case 'list':
      return 'List';
    case 'page':
      return 'Page';
    case 'newsfeed':
      return 'News feed';
    case 'widget':
      return 'Widget';
    case 'webpage':
      return 'Web page';
    case 'map':
      return 'Map';
    case 'shop':
      return 'Shop';
    case 'group':
      return 'Group';
    case 'default':
      return 'Object';
    default: {
      const _e: never = switcher;
      return _e;
    }
  }
}

function primaryTabs(
  updatesCount: number,
  followersCount: number,
): ObjectPrimaryTabView[] {
  return [
    { segment: 'reviews', label: 'Reviews' },
    { segment: 'gallery', label: 'Gallery' },
    { segment: 'updates', label: 'Updates', count: updatesCount },
    { segment: 'followers', label: 'Followers', count: followersCount },
    { segment: 'experts', label: 'Experts' },
  ];
}

const FEED_SUB_TABS: ObjectFeedSubTabView[] = [
  { segment: 'posts', label: 'Posts' },
  { segment: 'threads', label: 'Threads' },
];

function miniCard(id: string, title: string): ObjectSidebarMiniCardView {
  return { id, title, imageSrc: null };
}

function coverImageUrl(fields: Record<string, unknown>): string | null {
  const v = fields.imageBackground;
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function workHoursLines(raw: string): string[] {
  const split = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return split.length > 0 ? split : [raw.trim()];
}

function mergeUniqueStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function buildLeftRailBlocks(viewLike: ProjectedObjectView): ObjectLeftRailBlock[] {
  const blocks: ObjectLeftRailBlock[] = [];

  const menuOrdered = applySortCustomToMenuItems(
    projectedMenuItems(viewLike),
    projectedSortCustom(viewLike),
  );
  if (menuOrdered.length > 0) {
    blocks.push({
      kind: MENU_BLOCK_ID,
      headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.menuItems,
      items: menuOrdered,
    });
  }

  for (const step of ABOUT_SECTION_BLOCK_ORDER) {
    switch (step) {
      case 'description': {
        const text = objectFields.description(viewLike)?.trim();
        if (text && text.length > 0) {
          blocks.push({
            kind: 'description',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.description,
            text,
          });
        }
        break;
      }
      case 'rating': {
        const rating01To5 = objectFields.ratingStars01To5(viewLike);
        if (rating01To5 != null) {
          blocks.push({
            kind: 'rating',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.rating,
            rating01To5,
          });
        }
        break;
      }
      case 'tags': {
        const labels = mergeUniqueStrings(
          projectedTagCategoryNames(viewLike),
          projectedTagCategoryItemValues(viewLike),
        );
        if (labels.length > 0) {
          blocks.push({
            kind: 'tags',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.tags,
            labels,
          });
        }
        break;
      }
      case 'gallery': {
        const urls = projectedGalleryImageUrls(viewLike);
        if (urls.length > 0) {
          blocks.push({
            kind: 'gallery',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.gallery,
            urls,
          });
        }
        break;
      }
      case 'price': {
        const price = projectedPrice(viewLike);
        if (price) {
          blocks.push({
            kind: 'price',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.price,
            text: price,
          });
        }
        break;
      }
      case 'workHours': {
        const hours = projectedWorkHours(viewLike);
        if (hours) {
          blocks.push({
            kind: 'workHours',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.workHours,
            lines: workHoursLines(hours),
          });
        }
        break;
      }
      case 'address': {
        const line = projectedAddressDisplayLine(viewLike);
        if (line) {
          blocks.push({
            kind: 'address',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.address,
            text: line,
          });
        }
        break;
      }
      case 'geo': {
        const coords = projectedGeoLatLon(viewLike);
        if (coords) {
          blocks.push({
            kind: 'geo',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.geo,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
        break;
      }
      case 'websites': {
        const entries = projectedWebsiteEntries(viewLike);
        if (entries.length > 0) {
          blocks.push({
            kind: 'websites',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.websites,
            entries,
          });
        }
        break;
      }
      case 'phones': {
        const numbers = projectedTelephones(viewLike);
        if (numbers.length > 0) {
          blocks.push({
            kind: 'phones',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.phones,
            numbers,
          });
        }
        break;
      }
      case 'email': {
        const addr = projectedEmail(viewLike);
        if (addr) {
          blocks.push({
            kind: 'email',
            headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.email,
            address: addr,
          });
        }
        break;
      }
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  }

  return blocks;
}

export function projectedObjectWithCountsToPageModel(
  api: ProjectedObjectWithCountsView,
): ObjectPageViewModel {
  const fields = api.fields ?? {};
  const viewLike = {
    object_id: api.object_id,
    object_type: api.object_type,
    semantic_type: api.semantic_type,
    weight: api.weight ?? null,
    fields,
    hasAdministrativeAuthority: api.hasAdministrativeAuthority ?? false,
    hasOwnershipAuthority: api.hasOwnershipAuthority ?? false,
  };

  const title = objectFields.name(viewLike)?.trim() || api.object_id;
  const subtitleTitleRaw = objectFields.titleUpdate(viewLike)?.trim();
  const subtitleTitle =
    subtitleTitleRaw && subtitleTitleRaw.length > 0 ? subtitleTitleRaw : null;
  const switcher = toSwitcherKind(api.object_type);

  const objectTypeRaw = api.object_type?.trim() ?? '';
  const kindLabel =
    objectTypeRaw.length > 0 ? objectTypeRaw : kindLabelFallback(switcher);

  const tagLabels = objectFields.tagCategoryLabels(viewLike);
  const tagline =
    tagLabels.length > 0 ? tagLabels.slice(-2).join(' · ') : null;

  const leftRailBlocks = buildLeftRailBlocks(viewLike);

  return {
    objectId: api.object_id,
    title,
    subtitleTitle,
    avatarUrl: objectFields.image(viewLike) ?? null,
    coverImageUrl: coverImageUrl(fields),
    kindLabel,
    tagline,
    displayWeightLabel:
      api.weight != null && Number.isFinite(api.weight)
        ? formatObjectWeightForDisplay(api.weight)
        : null,
    objectType: switcher,
    rating01To5: objectFields.ratingStars01To5(viewLike),
    primaryTabs: primaryTabs(api.updates_count, api.followers_count),
    feedSubTabs: FEED_SUB_TABS,
    leftRailBlocks,
    rightFeatured: [miniCard('ex-f1', 'Experts')],
    rightRelated: [miniCard('nr-f1', 'Nearby')],
    rightSimilar: [miniCard('sm-f1', 'Similar')],
  };
}
