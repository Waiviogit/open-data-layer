import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import type { ProjectedMenuItem } from './projected-menu-item.types';
import type { ProjectedSortCustom } from './projected-list-item.types';
import type { ObjectSwitcherKind } from './object-page.types';
import { isMenuInHostTargetType } from './object-menu.constants';

/** Default center column / tab when opening `/object/:id` with no `?tab=` or `?path=`. */
export type ObjectDefaultLanding =
  | { kind: 'hostContent' }
  | { kind: 'nestedInHost'; targetObjectId: string }
  | { kind: 'primaryTab'; segment: 'reviews' | 'newsfeed' | 'description' }
  | { kind: 'routeStub'; segment: 'blog' | 'newsFilter'; ref: string };

const HOST_SWITCHER_KINDS = new Set<ObjectSwitcherKind>([
  'list',
  'page',
  'newsfeed',
  'widget',
  'webpage',
  'map',
  'shop',
  'group',
]);

/** Types routed through legacy `getDefaultLink` in object-processor. */
const DEFAULT_LINK_OBJECT_TYPES = new Set([
  'business',
  'product',
  'service',
  'company',
  'person',
  'place',
  'hotel',
  'restaurant',
]);

export type ResolveObjectDefaultLandingDeps = {
  projectedMenuItems: (view: ProjectedObjectView) => ProjectedMenuItem[];
  projectedSortCustom: (view: ProjectedObjectView) => ProjectedSortCustom | null;
  resolveMenuItemsForView: (view: ProjectedObjectView) => ProjectedMenuItem[];
  projectedListItems: (
    view: ProjectedObjectView,
  ) => { objectId: string; objectType: string }[];
};

function menuItemTargetType(item: ProjectedMenuItem): string | undefined {
  return item.object_type ?? item.object?.object_type;
}

function menuItemMatchesKey(item: ProjectedMenuItem, key: string): boolean {
  if (item.title === key || item.displayTitle === key) {
    return true;
  }
  if (item.link_to_object === key || item.link_to_web === key) {
    return true;
  }
  return false;
}

function resolveMenuItemLanding(item: ProjectedMenuItem): ObjectDefaultLanding {
  const targetId = item.link_to_object?.trim();
  if (!targetId) {
    return { kind: 'primaryTab', segment: 'reviews' };
  }
  const type = menuItemTargetType(item) ?? '';
  if (isMenuInHostTargetType(type)) {
    return { kind: 'nestedInHost', targetObjectId: targetId };
  }
  return { kind: 'primaryTab', segment: 'reviews' };
}

function readStringField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function findBlogRef(fields: Record<string, unknown>, key: string): string | null {
  const raw = fields.blog;
  if (!Array.isArray(raw)) {
    return null;
  }
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      continue;
    }
    const body = readStringField((row as Record<string, unknown>).body);
    if (body === key) {
      return body;
    }
  }
  return null;
}

function findNewsFilterRef(fields: Record<string, unknown>, key: string): string | null {
  const raw = fields.newsFilter;
  if (!Array.isArray(raw)) {
    return null;
  }
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      continue;
    }
    const record = row as Record<string, unknown>;
    const permlink = readStringField(record.permlink);
    if (permlink === key) {
      return permlink;
    }
  }
  return null;
}

/** Legacy `getLinkFromMenuItem` → landing descriptor. */
function resolveMenuItemLandingFromCustomSort(
  viewLike: ProjectedObjectView,
  key: string,
  deps: ResolveObjectDefaultLandingDeps,
): ObjectDefaultLanding | null {
  const menuItems = deps.projectedMenuItems(viewLike);
  const menu = menuItems.find((item) => menuItemMatchesKey(item, key));
  if (menu) {
    return resolveMenuItemLanding(menu);
  }

  const listItem = deps.projectedListItems(viewLike).find((item) => item.objectId === key);
  if (listItem) {
    return { kind: 'nestedInHost', targetObjectId: listItem.objectId };
  }

  const blogRef = findBlogRef(viewLike.fields, key);
  if (blogRef) {
    return { kind: 'routeStub', segment: 'blog', ref: blogRef };
  }

  const newsRef = findNewsFilterRef(viewLike.fields, key);
  if (newsRef) {
    return { kind: 'routeStub', segment: 'newsFilter', ref: newsRef };
  }

  return null;
}

/** Legacy `getCustomSortLink`. */
function resolveCustomSortLanding(
  viewLike: ProjectedObjectView,
  objectTypeKey: string,
  sortCustom: ProjectedSortCustom,
  deps: ResolveObjectDefaultLandingDeps,
): ObjectDefaultLanding | null {
  if (objectTypeKey === 'list') {
    return { kind: 'hostContent' };
  }

  const firstKey = sortCustom.include[0];
  if (!firstKey) {
    return null;
  }

  return resolveMenuItemLandingFromCustomSort(viewLike, firstKey, deps);
}

/** Legacy `getDefaultLink`. */
function resolveDefaultLinkLanding(
  viewLike: ProjectedObjectView,
  deps: ResolveObjectDefaultLandingDeps,
): ObjectDefaultLanding {
  const rawMenuItems = deps.projectedMenuItems(viewLike);
  if (rawMenuItems.length > 0) {
    return resolveMenuItemLanding(rawMenuItems[0]!);
  }

  const fromListItems = deps.resolveMenuItemsForView(viewLike);
  const firstWithTarget = fromListItems.find((item) => item.link_to_object?.trim());
  if (firstWithTarget?.link_to_object) {
    return { kind: 'nestedInHost', targetObjectId: firstWithTarget.link_to_object.trim() };
  }

  const fields = viewLike.fields;
  const newsRaw = fields.newsFilter;
  if (Array.isArray(newsRaw) && newsRaw.length > 0) {
    const first = newsRaw[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const permlink = readStringField((first as Record<string, unknown>).permlink);
      if (permlink) {
        return { kind: 'routeStub', segment: 'newsFilter', ref: permlink };
      }
    }
  }

  const blogRaw = fields.blog;
  if (Array.isArray(blogRaw) && blogRaw.length > 0) {
    const first = blogRaw[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const body = readStringField((first as Record<string, unknown>).body);
      if (body) {
        return { kind: 'routeStub', segment: 'blog', ref: body };
      }
    }
  }

  return { kind: 'primaryTab', segment: 'reviews' };
}

/**
 * Legacy object page UX (waivio #5205): when default link is Reviews but there are no
 * linked posts and Description content exists, open Description so the center column is not empty.
 * @see https://github.com/Waiviogit/waivio/issues/5205
 */
export function applyDescriptionFallbackToDefaultLanding(
  landing: ObjectDefaultLanding,
  input: {
    postsCount: number;
    hasDescriptionPageContent: boolean;
  },
): ObjectDefaultLanding {
  if (landing.kind !== 'primaryTab' || landing.segment !== 'reviews') {
    return landing;
  }
  if (input.postsCount > 0 || !input.hasDescriptionPageContent) {
    return landing;
  }
  return { kind: 'primaryTab', segment: 'description' };
}

function resolveHostTypeLanding(
  switcherKind: ObjectSwitcherKind,
  objectTypeKey: string,
): ObjectDefaultLanding | null {
  if (objectTypeKey === 'html') {
    return { kind: 'hostContent' };
  }
  if (HOST_SWITCHER_KINDS.has(switcherKind)) {
    return { kind: 'hostContent' };
  }
  return null;
}

function usesDefaultLink(objectTypeKey: string, switcherKind: ObjectSwitcherKind): boolean {
  return switcherKind === 'default' && DEFAULT_LINK_OBJECT_TYPES.has(objectTypeKey);
}

/**
 * Port of legacy object-processor `getLinkToPageLoad` / `getDefaultLink` / `getCustomSortLink`.
 * @see tmp/object-processor/src/index.ts
 */
export function resolveObjectDefaultLanding(
  viewLike: ProjectedObjectView,
  switcherKind: ObjectSwitcherKind,
  objectTypeKey: string,
  deps: ResolveObjectDefaultLandingDeps,
): ObjectDefaultLanding {
  const sortCustom = deps.projectedSortCustom(viewLike);
  if (sortCustom && sortCustom.include.length > 0) {
    const fromCustom = resolveCustomSortLanding(
      viewLike,
      objectTypeKey,
      sortCustom,
      deps,
    );
    if (fromCustom) {
      return fromCustom;
    }
  }

  const fromHostType = resolveHostTypeLanding(switcherKind, objectTypeKey);
  if (fromHostType) {
    return fromHostType;
  }

  if (usesDefaultLink(objectTypeKey, switcherKind)) {
    return resolveDefaultLinkLanding(viewLike, deps);
  }

  return { kind: 'primaryTab', segment: 'reviews' };
}
