import {
  objectFields,
  type ProjectedObjectView,
} from '@/modules/feed/application/dto/object-fields';

import {
  ABOUT_SECTION_BLOCK_ORDER,
  BOOK_HOISTED_AUTHOR_BLOCK_ORDER,
  bookTypeAboutRemainderOrder,
  HEADER_BLOCK_ORDER,
  isBookObjectType,
  isOptionsObjectType,
  isRecipeObjectType,
  MENU_BLOCK_ID,
  NAVIGATE_SECTION_BLOCK_ORDER,
  optionsTypeAboutRemainderOrder,
  resolveAboutSectionBlockOrder,
  type AboutSectionBlockId,
} from '../domain/object-left-rail-order';
import {
  applyDescriptionFallbackToDefaultLanding,
  resolveObjectDefaultLanding,
} from '../domain/resolve-object-default-landing';
import type {
  ObjectFeedSubTabView,
  ObjectLeftRailBlock,
  ObjectOptionValueView,
  ObjectPageSeoView,
  ObjectPageViewModel,
  ObjectPrimaryTabView,
  ObjectSwitcherKind,
} from '../domain/object-page.types';
import {
  OBJECT_LEFT_RAIL_BLOCK_LABEL,
} from '../domain/object-update-labels';
import { shouldShowPermanentlyClosedLocationNotice } from '../domain/object-status-label';
import { LIST_PRIMARY_TAB_SEGMENT } from '../domain/list.constants';
import {
  DETAILS_PRIMARY_TAB_SEGMENT,
  objectTypeHasDetailsTab,
} from '../domain/object-page-url.constants';
import { WIDGET_PRIMARY_TAB_SEGMENT } from '../domain/widget.constants';

import type { ProjectedObjectWithCountsView } from './object-resolve.types';
import type { ObjectOptionsApiResponse } from './fetch-object-options.server';
import {
  applySortCustomToListItems,
  projectedAddressDisplayLine,
  projectedButtonItems,
  projectedEmail,
  projectedFeatureListItems,
  projectedInLanguage,
  projectedGalleryAlbums,
  projectedPreviewGallery,
  projectedLeftRailPreviewGallery,
  projectedGalleryImageUrls,
  projectedIdentifierRows,
  projectedProductGroupId,
  projectedGeoLatLon,
  projectedListItems,
  projectedMenuItems,
  projectedObjectLinkRows,
  projectedDescriptionContent,
  projectedObjectRefItems,
  projectedPageContent,
  projectedLegalText,
  projectedSkillContent,
  projectedLicense,
  projectedCompatibility,
  projectedMetadataItems,
  projectedAllowedTools,
  projectedWidgetConfig,
  projectedParentRow,
  resolveMenuItemsForView,
  projectedPrice,
  projectedCalories,
  projectedBudget,
  projectedCookTime,
  projectedNutrition,
  projectedIngredients,
  orderRecipeTagCategorySections,
  projectedSortCustom,
  projectedTagCategoryNames,
  projectedCategoryNames,
  projectedDatePublished,
  projectedPrintLength,
  projectedGalleryAlbumNames,
  projectedTagCategorySections,
  projectedTelephoneEntries,
  projectedTypicalAgeRange,
  projectedWebsiteEntries,
  projectedProductWeight,
  projectedProductSize,
  projectedWalletAddressRows,
  projectedWorkHours,
  projectedUserRefAccounts,
  projectedObjectControl,
  projectedInheritsFromEntries,
  projectedValidityCutoffEntries,
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
  'skill',
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

const DEFAULT_LANDING_DEPS = {
  projectedMenuItems,
  projectedSortCustom,
  resolveMenuItemsForView,
  projectedListItems,
} as const;

/** Fallback label when `object_type` from API is empty. */
function kindLabelFallback(switcher: ObjectSwitcherKind): string {
  switch (switcher) {
    case 'list':
      return 'List';
    case 'page':
      return 'Page';
    case 'skill':
      return 'Skill';
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

function buildPrimaryTabs(input: {
  objectTypeKey: string;
  updatesCount: number;
  followersCount: number;
  expertsCount: number;
}): ObjectPrimaryTabView[] {
  const base: ObjectPrimaryTabView[] = [
    { segment: 'reviews', label: 'Reviews' },
    { segment: 'gallery', label: 'Gallery' },
    { segment: 'updates', label: 'Updates', count: input.updatesCount },
    { segment: 'followers', label: 'Followers', count: input.followersCount },
    { segment: 'ownership', label: 'Ownership' },
    { segment: 'experts', label: 'Experts', count: input.expertsCount },
  ];

  if (input.objectTypeKey === 'widget') {
    return [{ segment: WIDGET_PRIMARY_TAB_SEGMENT, label: 'Widget' }, ...base];
  }

  if (input.objectTypeKey === 'list') {
    return [{ segment: LIST_PRIMARY_TAB_SEGMENT, label: 'List' }, ...base];
  }

  if (objectTypeHasDetailsTab(input.objectTypeKey)) {
    return [{ segment: DETAILS_PRIMARY_TAB_SEGMENT, label: 'Details' }, ...base];
  }

  return base;
}

const FEED_SUB_TABS: ObjectFeedSubTabView[] = [
  { segment: 'posts', label: 'Posts' },
  { segment: 'threads', label: 'Threads' },
  { segment: 'activity', label: 'Activity' },
];

function coverImageUrl(fields: Record<string, unknown>): string | null {
  const v = fields.imageBackground;
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function parseSeo(api: ProjectedObjectWithCountsView): ObjectPageSeoView | null {
  const raw = api.seo;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const jsonLdRaw = record.json_ld;
  return {
    title: typeof record.title === 'string' ? record.title : null,
    description:
      typeof record.description === 'string' ? record.description : null,
    canonical_url:
      typeof record.canonical_url === 'string' ? record.canonical_url : null,
    json_ld:
      jsonLdRaw && typeof jsonLdRaw === 'object' && !Array.isArray(jsonLdRaw)
        ? { ...(jsonLdRaw as Record<string, unknown>) }
        : {},
    keywords: parseSeoKeywords(record.keywords),
  };
}

function parseSeoKeywords(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const out = raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return out.length > 0 ? out : null;
}

function workHoursLines(raw: string): string[] {
  const split = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return split.length > 0 ? split : [raw.trim()];
}

function mapOptionsApiToCategories(
  options: ObjectOptionsApiResponse['options'],
): { category: string; values: ObjectOptionValueView[] }[] {
  return Object.entries(options).map(([category, entries]) => ({
    category,
    values: entries.map((entry) => ({
      objectId: entry.object_id,
      category: entry.category,
      value: entry.value,
      position: entry.position,
      image: entry.image,
      price: entry.price,
      imageUrl: entry.imageUrl,
    })),
  }));
}

function appendHeaderBlocks(
  blocks: ObjectLeftRailBlock[],
  viewLike: ProjectedObjectView,
): void {
  for (const step of HEADER_BLOCK_ORDER) {
    if (step === 'name') {
      const text = objectFields.name(viewLike)?.trim();
      if (text && text.length > 0) {
        blocks.push({
          kind: 'name',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.name,
          text,
        });
      }
      continue;
    }
    if (step === 'title') {
      const text = objectFields.titleUpdate(viewLike)?.trim();
      if (text && text.length > 0) {
        blocks.push({
          kind: 'title',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.title,
          text,
        });
      }
    }
  }
}

function appendMenuClusterBlocks(
  blocks: ObjectLeftRailBlock[],
  viewLike: ProjectedObjectView,
): void {
  const menuOrdered = resolveMenuItemsForView(viewLike);
  if (menuOrdered.length > 0) {
    blocks.push({
      kind: MENU_BLOCK_ID,
      headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.menuItems,
      items: menuOrdered,
    });
  }

  const buttonItems = projectedButtonItems(viewLike);
  if (buttonItems.length > 0) {
    blocks.push({
      kind: 'button',
      headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.button,
      items: buttonItems,
    });
  }
}

function appendAboutSectionBlock(
  blocks: ObjectLeftRailBlock[],
  step: AboutSectionBlockId,
  viewLike: ProjectedObjectView,
  optionsApi?: ObjectOptionsApiResponse | null,
): void {
  switch (step) {
    case 'image':
    case 'imageBackground':
    case 'status':
    case 'compareAtPrice':
    case 'saleEvent':
      // Edit-mode only — shown via mergeLeftRailBlocksForEditMode, skip in view mode.
      break;
    case 'calories': {
      const text = projectedCalories(viewLike);
      if (text) {
        blocks.push({
          kind: 'calories',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.calories,
          text,
        });
      }
      break;
    }
    case 'budget': {
      const text = projectedBudget(viewLike);
      if (text) {
        blocks.push({
          kind: 'budget',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.budget,
          text,
        });
      }
      break;
    }
    case 'cookTime': {
      const text = projectedCookTime(viewLike);
      if (text) {
        blocks.push({
          kind: 'cookTime',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.cookTime,
          text,
        });
      }
      break;
    }
    case 'nutrition': {
      const text = projectedNutrition(viewLike);
      if (text) {
        blocks.push({
          kind: 'nutrition',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.nutrition,
          text,
        });
      }
      break;
    }
    case 'ingredients': {
      const items = projectedIngredients(viewLike);
      if (items.length > 0) {
        blocks.push({
          kind: 'ingredients',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.ingredients,
          items,
        });
      }
      break;
    }
    case 'datePublished': {
      if (!isBookObjectType(viewLike.object_type ?? '')) {
        break;
      }
      const text = projectedDatePublished(viewLike);
      if (text) {
        blocks.push({
          kind: 'datePublished',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.datePublished,
          text,
        });
      }
      break;
    }
    case 'printLength': {
      if (!isBookObjectType(viewLike.object_type ?? '')) {
        break;
      }
      const text = projectedPrintLength(viewLike);
      if (text) {
        blocks.push({
          kind: 'printLength',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.printLength,
          text,
        });
      }
      break;
    }
    case 'inLanguage': {
      if (!isBookObjectType(viewLike.object_type ?? '')) {
        break;
      }
      const text = projectedInLanguage(viewLike);
      if (text) {
        blocks.push({
          kind: 'inLanguage',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.inLanguage,
          text,
        });
      }
      break;
    }
    case 'typicalAgeRange': {
      if (!isBookObjectType(viewLike.object_type ?? '')) {
        break;
      }
      const text = projectedTypicalAgeRange(viewLike);
      if (text) {
        blocks.push({
          kind: 'typicalAgeRange',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.typicalAgeRange,
          text,
        });
      }
      break;
    }
    case 'category': {
      const names = projectedCategoryNames(viewLike);
      if (names.length > 0) {
        blocks.push({
          kind: 'category',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.category,
          names,
        });
      }
      break;
    }
    case 'brand': {
      const items = projectedObjectRefItems(viewLike, 'brand');
      if (items.length > 0) {
        blocks.push({ kind: 'brand', headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.brand, items });
      }
      break;
    }
    case 'manufacturer': {
      const items = projectedObjectRefItems(viewLike, 'manufacturer');
      if (items.length > 0) {
        blocks.push({ kind: 'manufacturer', headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.manufacturer, items });
      }
      break;
    }
    case 'merchant': {
      const items = projectedObjectRefItems(viewLike, 'merchant');
      if (items.length > 0) {
        blocks.push({ kind: 'merchant', headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.merchant, items });
      }
      break;
    }
    case 'featureList': {
      const items = projectedFeatureListItems(viewLike);
      if (items.length > 0) {
        blocks.push({
          kind: 'featureList',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.featureList,
          items,
        });
      }
      break;
    }
    case 'license': {
      const text = projectedLicense(viewLike);
      if (text) {
        blocks.push({
          kind: 'license',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.license,
          text,
        });
      }
      break;
    }
    case 'compatibility': {
      const text = projectedCompatibility(viewLike);
      if (text) {
        blocks.push({
          kind: 'compatibility',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.compatibility,
          text,
        });
      }
      break;
    }
    case 'metadata': {
      const items = projectedMetadataItems(viewLike);
      if (items.length > 0) {
        blocks.push({
          kind: 'metadata',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.metadata,
          items,
        });
      }
      break;
    }
    case 'allowedTools': {
      const items = projectedAllowedTools(viewLike);
      if (items.length > 0) {
        blocks.push({
          kind: 'allowedTools',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.allowedTools,
          items,
        });
      }
      break;
    }
    case 'references': {
      const items = projectedObjectRefItems(viewLike, 'references');
      if (items.length > 0) {
        blocks.push({
          kind: 'references',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.references,
          items,
        });
      }
      break;
    }
    case 'author': {
      const items = projectedObjectRefItems(viewLike, 'author');
      if (items.length > 0) {
        blocks.push({ kind: 'author', headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.author, items });
      }
      break;
    }
    case 'publisher': {
      const items = projectedObjectRefItems(viewLike, 'publisher');
      if (items.length > 0) {
        blocks.push({ kind: 'publisher', headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.publisher, items });
      }
      break;
    }
    case 'parent': {
      const row = projectedParentRow(viewLike);
      if (row) {
        blocks.push({
          kind: 'parent',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.parent,
          objectId: row.objectId,
          name: row.name,
          imageUrl: row.imageUrl,
        });
      }
      break;
    }
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
      const aspects = objectFields
        .aggregateRatingAspects(viewLike)
        .filter(
          (a): a is typeof a & { update_id: string } =>
            typeof a.update_id === 'string' && a.update_id.length > 0,
        )
        .map((a) => ({
          update_id: a.update_id,
          dimension: a.dimension,
          averageRating01To5:
            a.averageRating != null && Number.isFinite(a.averageRating)
              ? Math.min(5, Math.max(0, a.averageRating / 2000))
              : null,
          totalVoters: a.totalVoters,
          viewerRating01To5:
            a.userRating != null && Number.isFinite(a.userRating)
              ? Math.min(5, Math.max(0, a.userRating / 2000))
              : null,
        }));
      if (aspects.length === 0) {
        break;
      }
      blocks.push({
        kind: 'rating',
        headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.rating,
        aspects,
      });
      break;
    }
    case 'tags': {
      let sections = projectedTagCategorySections(viewLike);
      if (isRecipeObjectType(viewLike.object_type ?? '')) {
        sections = orderRecipeTagCategorySections(sections);
      }
      if (sections.length > 0) {
        blocks.push({
          kind: 'tags',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.tags,
          sections,
        });
      }
      break;
    }
    case 'gallery': {
      const photos = projectedLeftRailPreviewGallery(viewLike);
      if (photos.length > 0) {
        blocks.push({
          kind: 'gallery',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.gallery,
          photos,
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
    case 'options': {
      const categories = optionsApi ? mapOptionsApiToCategories(optionsApi.options) : [];
      if (categories.length > 0) {
        blocks.push({
          kind: 'options',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.options,
          currentObjectId: viewLike.object_id,
          categories,
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
    case 'productWeight': {
      const weight = projectedProductWeight(viewLike);
      if (weight) {
        blocks.push({
          kind: 'productWeight',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.productWeight,
          value: weight.value,
          unit: weight.unit,
        });
      }
      break;
    }
    case 'size': {
      const dimensions = projectedProductSize(viewLike);
      if (dimensions) {
        blocks.push({
          kind: 'size',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.size,
          length: dimensions.length,
          width: dimensions.width,
          depth: dimensions.depth,
          unit: dimensions.unit,
        });
      }
      break;
    }
    case 'link': {
      const social = projectedObjectLinkRows(viewLike);
      if (social.length > 0) {
        blocks.push({
          kind: 'link',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.link,
          items: social,
        });
      }
      break;
    }
    case 'phones': {
      const entries = projectedTelephoneEntries(viewLike);
      if (entries.length > 0) {
        blocks.push({
          kind: 'phones',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.phones,
          entries,
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
    case 'walletAddress': {
      const wallets = projectedWalletAddressRows(viewLike);
      if (wallets.length > 0) {
        blocks.push({
          kind: 'walletAddress',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.walletAddress,
          items: wallets,
        });
      }
      break;
    }
    case 'identifier': {
      const identifiers = projectedIdentifierRows(viewLike);
      if (identifiers.length > 0) {
        blocks.push({
          kind: 'identifier',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.identifier,
          rows: identifiers,
        });
      }
      break;
    }
    case 'productGroupId': {
      const text = projectedProductGroupId(viewLike);
      if (text) {
        blocks.push({
          kind: 'productGroupId',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.productGroupId,
          text,
        });
      }
      break;
    }
    case 'objectControl': {
      const text = projectedObjectControl(viewLike);
      if (text) {
        blocks.push({
          kind: 'objectControl',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.objectControl,
          text,
        });
      }
      break;
    }
    case 'admins':
    case 'moderators':
    case 'trusted':
    case 'authorities':
    case 'whitelist':
    case 'restricted':
    case 'banned': {
      const accounts = projectedUserRefAccounts(viewLike, step);
      if (accounts.length > 0) {
        blocks.push({
          kind: step,
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL[step],
          accounts,
        });
      }
      break;
    }
    case 'inheritsFrom': {
      const entries = projectedInheritsFromEntries(viewLike);
      if (entries.length > 0) {
        blocks.push({
          kind: 'inheritsFrom',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.inheritsFrom,
          entries,
        });
      }
      break;
    }
    case 'validityCutoff': {
      const entries = projectedValidityCutoffEntries(viewLike);
      if (entries.length > 0) {
        blocks.push({
          kind: 'validityCutoff',
          headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.validityCutoff,
          entries,
        });
      }
      break;
    }
    case 'delegation':
      // Edit-mode only — shown via mergeLeftRailBlocksForEditMode.
      break;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

function appendAboutSectionBlocks(
  blocks: ObjectLeftRailBlock[],
  steps: readonly AboutSectionBlockId[],
  viewLike: ProjectedObjectView,
  optionsApi?: ObjectOptionsApiResponse | null,
): void {
  for (const step of steps) {
    appendAboutSectionBlock(blocks, step, viewLike, optionsApi);
  }
}

function prependClosedVenueStatusBlock(
  blocks: ObjectLeftRailBlock[],
  viewLike: ProjectedObjectView,
): void {
  const coreStatus =
    typeof viewLike.status === 'string' && viewLike.status.trim().length > 0
      ? viewLike.status.trim()
      : 'active';
  if (
    !shouldShowPermanentlyClosedLocationNotice(
      coreStatus,
      viewLike.object_type ?? '',
    )
  ) {
    return;
  }
  blocks.unshift({
    kind: 'status',
    headingLabel: OBJECT_LEFT_RAIL_BLOCK_LABEL.status,
    status: 'closed',
  });
}

function buildLeftRailBlocks(
  viewLike: ProjectedObjectView,
  optionsApi?: ObjectOptionsApiResponse | null,
): ObjectLeftRailBlock[] {
  const blocks: ObjectLeftRailBlock[] = [];
  const isOptionsType = isOptionsObjectType(viewLike.object_type ?? '');

  if (isOptionsType) {
    const isBook = isBookObjectType(viewLike.object_type ?? '');
    appendHeaderBlocks(blocks, viewLike);
    if (isBook) {
      appendAboutSectionBlocks(blocks, BOOK_HOISTED_AUTHOR_BLOCK_ORDER, viewLike, optionsApi);
    }
    appendAboutSectionBlocks(blocks, ['parent', 'publisher'], viewLike, optionsApi);
    appendAboutSectionBlocks(blocks, NAVIGATE_SECTION_BLOCK_ORDER, viewLike, optionsApi);
    appendMenuClusterBlocks(blocks, viewLike);
    appendAboutSectionBlocks(
      blocks,
      isBook ? bookTypeAboutRemainderOrder() : optionsTypeAboutRemainderOrder(),
      viewLike,
      optionsApi,
    );
    prependClosedVenueStatusBlock(blocks, viewLike);
    return blocks;
  }

  appendMenuClusterBlocks(blocks, viewLike);
  appendHeaderBlocks(blocks, viewLike);
  appendAboutSectionBlocks(
    blocks,
    resolveAboutSectionBlockOrder(viewLike.object_type ?? ''),
    viewLike,
    optionsApi,
  );
  prependClosedVenueStatusBlock(blocks, viewLike);

  return blocks;
}

function readIsFavorited(api: ProjectedObjectWithCountsView): boolean {
  const legacy = (api as Record<string, unknown>)['hasAdministrativeAuthority'];
  return api.isFavorited ?? legacy === true;
}

function readHasSupervisedOwnership(api: ProjectedObjectWithCountsView): boolean {
  const legacy = (api as Record<string, unknown>)['hasOwnershipAuthority'];
  return api.hasSupervisedOwnership ?? false;
}

function readHasExclusiveOwnership(api: ProjectedObjectWithCountsView): boolean {
  const legacy = (api as Record<string, unknown>)['hasOwnershipAuthority'];
  return api.hasExclusiveOwnership ?? legacy === true;
}

function readFavoritedByCount(api: ProjectedObjectWithCountsView): number {
  const legacy = (api as Record<string, unknown>)['administrative_count'];
  if (typeof api.favorited_by_count === 'number') {
    return api.favorited_by_count;
  }
  return typeof legacy === 'number' ? legacy : 0;
}

function readSupervisedOwnershipCount(api: ProjectedObjectWithCountsView): number {
  return typeof api.supervised_count === 'number' ? api.supervised_count : 0;
}

function readExclusiveOwnershipCount(api: ProjectedObjectWithCountsView): number {
  if (typeof api.exclusive_count === 'number') {
    return api.exclusive_count;
  }
  const legacy = (api as Record<string, unknown>)['ownership_count'];
  return typeof legacy === 'number' ? legacy : 0;
}

export function projectedObjectWithCountsToPageModel(
  api: ProjectedObjectWithCountsView,
  optionsApi?: ObjectOptionsApiResponse | null,
): ObjectPageViewModel {
  const fields = api.fields ?? {};

  const rootParent = (api as Record<string, unknown>)['parent'];
  const parentHoist =
    rootParent !== null &&
    typeof rootParent === 'object' &&
    !Array.isArray(rootParent)
      ? { parent: rootParent }
      : {};

  const viewLike = {
    object_id: api.object_id,
    object_type: api.object_type,
    semantic_type: api.semantic_type,
    status:
      typeof api.status === 'string' && api.status.trim().length > 0
        ? api.status.trim()
        : undefined,
    weight: api.weight ?? null,
    fields,
    isFavorited: readIsFavorited(api),
    hasSupervisedOwnership: readHasSupervisedOwnership(api),
    hasExclusiveOwnership: readHasExclusiveOwnership(api),
    previewGallery: api.previewGallery,
    galleryAlbums: api.galleryAlbums,
    ...parentHoist,
  } as ProjectedObjectView;

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

  const leftRailBlocks = buildLeftRailBlocks(viewLike, optionsApi);
  const tagCategoryNames = projectedTagCategoryNames(viewLike);
  const onChainGalleryAlbumNames = projectedGalleryAlbumNames(viewLike);
  const sortCustom = projectedSortCustom(viewLike);
  const listItems = applySortCustomToListItems(
    projectedListItems(viewLike),
    sortCustom,
  );
  const pageContent = projectedPageContent(viewLike);
  const legalText = projectedLegalText(viewLike);
  const skillContent = projectedSkillContent(viewLike);
  const widgetConfig = projectedWidgetConfig(viewLike);
  const descriptionContent = projectedDescriptionContent(viewLike);
  const previewGallery = projectedPreviewGallery(viewLike);
  const galleryAlbums = projectedGalleryAlbums(viewLike);
  const hasDescriptionPageContent =
    Boolean(descriptionContent?.trim()) || previewGallery.length > 0;
  const defaultLanding = applyDescriptionFallbackToDefaultLanding(
    resolveObjectDefaultLanding(
      viewLike,
      switcher,
      objectTypeRaw,
      DEFAULT_LANDING_DEPS,
    ),
    {
      postsCount: api.posts_count ?? 0,
      hasDescriptionPageContent,
    },
  );

  return {
    objectId: api.object_id,
    title,
    subtitleTitle,
    avatarUrl: objectFields.image(viewLike) ?? null,
    coverImageUrl: coverImageUrl(fields),
    kindLabel,
    lifecycleStatus:
      typeof api.status === 'string' && api.status.trim().length > 0
        ? api.status.trim()
        : 'active',
    tagline,
    displayWeightLabel:
      api.weight != null && Number.isFinite(api.weight)
        ? formatObjectWeightForDisplay(api.weight)
        : null,
    objectTypeKey: objectTypeRaw,
    objectType: switcher,
    defaultLanding,
    listItems,
    listItemsSortCustom: sortCustom,
    pageContent,
    legalText,
    skillContent,
    widgetConfig,
    descriptionContent,
    previewGallery,
    galleryAlbums,
    onChainGalleryAlbumNames,
    rating01To5: objectFields.ratingStars01To5(viewLike),
    primaryTabs: buildPrimaryTabs({
      objectTypeKey: objectTypeRaw,
      updatesCount: api.updates_count,
      followersCount: api.followers_count,
      expertsCount: api.experts_count,
    }),
    feedSubTabs: FEED_SUB_TABS,
    isFavorited: readIsFavorited(api),
    hasSupervisedOwnership: readHasSupervisedOwnership(api),
    hasExclusiveOwnership: readHasExclusiveOwnership(api),
    isFollowing: api.is_following ?? false,
    viewerBell: api.viewer_bell ?? false,
    updateTypeCounts: api.update_type_counts ?? {},
    updateLocales: api.update_locales ?? [],
    favoritedByCount: readFavoritedByCount(api),
    supervisedOwnershipCount: readSupervisedOwnershipCount(api),
    exclusiveOwnershipCount: readExclusiveOwnershipCount(api),
    leftRailBlocks,
    tagCategoryNames,
    rightRelated: [],
    rightSimilar: [],
    rightAddOn: [],
    rightRelatedHasMore: false,
    rightSimilarHasMore: false,
    rightAddOnHasMore: false,
    seo: parseSeo(api),
  };
}
