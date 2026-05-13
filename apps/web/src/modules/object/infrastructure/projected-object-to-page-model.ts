import { objectFields } from '@/modules/feed/application/dto/object-fields';

import type {
  ObjectAboutPanelView,
  ObjectFeedSubTabView,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSidebarMiniCardView,
  ObjectSwitcherKind,
} from '../domain/object-page.types';

import type { ProjectedObjectWithCountsView } from './object-resolve.types';

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

  const description = objectFields.description(viewLike)?.trim() ?? '';

  const aboutPanel: ObjectAboutPanelView = {
    introParagraph: description,
    prosTags: undefined,
    galleryThumbUrls: [],
    hoursLines: [],
    overallReviewCount: undefined,
  };

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
    aboutPanel,
    rightFeatured: [miniCard('ex-f1', 'Experts')],
    rightRelated: [miniCard('nr-f1', 'Nearby')],
    rightSimilar: [miniCard('sm-f1', 'Similar')],
  };
}
