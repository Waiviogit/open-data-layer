'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FeedColumn } from '@/shared/presentation/layout';

import type { ProjectedListItem, ProjectedSortCustom } from '../../domain/projected-list-item.types';
import type { CatalogListSortOption } from './object-list-content';
import type {
  ObjectFeedSubTabView,
  ObjectNestedViewEntry,
  ObjectNestedViewResolved,
  ObjectSwitcherKind,
} from '../../domain/object-page.types';

import { resolveNestedObjectContentAction } from '../../application/actions/resolve-nested-object-content.action';
import { resolveNestedObjectPathAction } from '../../application/actions/resolve-nested-object-path.action';
import { OBJECT_PAGE_VIEW_PATH_PARAM } from '../../domain/object-page-url.constants';
import { parseViewPathFromUrlSearchParams } from '../../domain/object-page-path';
import {
  applySortCustomToListItems,
  resolveListItemCatalogSortType,
} from '../../infrastructure/object-projected-fields';

import { ObjectCenterBreadcrumbs } from './object-center-breadcrumbs';
import { ObjectFeedSubNav } from './object-feed-sub-nav';
import { ObjectListContent } from './object-list-content';
import { ObjectNestedPageBody } from './object-nested-page-body';
import { ObjectWriteReviewPrompt } from './object-write-review-prompt';

const REVIEWS_SEGMENT = 'reviews';

function stubPrimaryCopy(primarySegment: string): string {
  switch (primarySegment) {
    case 'gallery':
      return 'Gallery';
    case 'updates':
      return 'Updates';
    case 'authority':
      return 'Authority';
    case 'followers':
      return 'Followers';
    case 'experts':
      return 'Experts';
    default:
      return 'This section';
  }
}

function centerHintForKind(kind: ObjectSwitcherKind): string {
  switch (kind) {
    case 'list':
      return 'Catalog-style layout (mock).';
    case 'page':
      return 'Rich page body (mock).';
    case 'newsfeed':
      return 'News feed preview (mock).';
    case 'widget':
      return 'Embedded widget (mock).';
    case 'webpage':
      return 'Web page (mock).';
    case 'map':
      return 'Map placement (mock).';
    case 'shop':
      return 'Shop departments (mock).';
    case 'group':
      return 'Group workspace (mock).';
    case 'default':
      return 'Reviews and discussions (mock).';
    default: {
      const _e: never = kind;
      return _e;
    }
  }
}

function resolvedToEntry(resolved: ObjectNestedViewResolved): ObjectNestedViewEntry {
  return { ...resolved, pending: false };
}

function overrideSortCustomForSort(
  base: ProjectedSortCustom | null,
  sortType: CatalogListSortOption,
): ProjectedSortCustom | null {
  if (sortType === 'custom') {
    return base;
  }
  return { include: [], exclude: base?.exclude ?? [], sortType };
}

function pendingEntryFromListItem(item: ProjectedListItem): ObjectNestedViewEntry {
  return {
    objectId: item.objectId,
    name: item.name,
    objectType: item.objectType as ObjectSwitcherKind,
    listItems: [],
    listItemsSortCustom: null,
    pageContentHtml: null,
    pending: true,
  };
}

const MOCK_STUB_HINT =
  'Tab content will load here when routes and APIs are connected.';
const MOCK_FEED_POSTS_HINT =
  'Posts list placeholder — replace with Story feed when data is available.';

export type ObjectPrimaryContentProps = {
  objectId: string;
  activePrimarySegment: string;
  activeFeedSubSegment: string;
  feedSubTabs: ObjectFeedSubTabView[];
  title: string;
  objectType: ObjectSwitcherKind;
  listItems: ProjectedListItem[];
  /** Raw `sortCustom` for the top-level list object. */
  listItemsSortCustom?: ProjectedSortCustom | null;
  onFeedSubSelect: (segment: string) => void;
  /** SSR-restored nested stack from `?path=`. */
  initialNestedStack?: ObjectNestedViewResolved[];
  /** SSR-resolved first menu item when URL has no `?path=` (business-like objects). */
  defaultNestedContent?: ObjectNestedViewResolved | null;
  /** Injected feed (client) when the Updates tab is active. */
  objectUpdatesFeed?: ReactNode;
  /** Injected feed (client) when the Followers tab is active. */
  objectFollowersFeed?: ReactNode | null;
  /** Injected feed (client) when the Authority tab is active. */
  objectAuthorityFeed?: ReactNode | null;
  /** Server-rendered page body for top-level page-type object. */
  objectPageBody?: ReactNode;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function ObjectPrimaryContent({
  objectId,
  activePrimarySegment,
  activeFeedSubSegment,
  feedSubTabs,
  title,
  objectType,
  listItems,
  listItemsSortCustom = null,
  onFeedSubSelect,
  initialNestedStack = [],
  defaultNestedContent = null,
  objectUpdatesFeed,
  objectFollowersFeed,
  objectAuthorityFeed,
  objectPageBody,
  viewerUsername,
  onRequireLogin,
}: ObjectPrimaryContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipUrlSyncRef = useRef(false);

  const [nestedStack, setNestedStack] = useState<ObjectNestedViewEntry[]>(() =>
    initialNestedStack.map(resolvedToEntry),
  );

  const initialPathKey = initialNestedStack.map((e) => e.objectId).join(',');
  const urlPathKey = searchParams.get(OBJECT_PAGE_VIEW_PATH_PARAM) ?? '';

  useEffect(() => {
    setNestedStack(initialNestedStack.map(resolvedToEntry));
  }, [objectId, initialPathKey, initialNestedStack]);

  const syncPathToUrl = useCallback(
    (stack: ObjectNestedViewEntry[], mode: 'push' | 'replace' = 'push') => {
      skipUrlSyncRef.current = true;
      const u = new URLSearchParams(searchParams.toString());
      if (stack.length === 0) {
        u.delete(OBJECT_PAGE_VIEW_PATH_PARAM);
      } else {
        u.set(OBJECT_PAGE_VIEW_PATH_PARAM, stack.map((e) => e.objectId).join(','));
      }
      const qs = u.toString();
      const base = `/object/${encodeURIComponent(objectId)}`;
      const href = qs ? `${base}?${qs}` : base;
      if (mode === 'replace') {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    },
    [objectId, router, searchParams],
  );

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const pathIds = parseViewPathFromUrlSearchParams(searchParams);
    const pathKey = pathIds.join(',');

    let cancelled = false;

    void (async () => {
      let needsFetch = false;
      setNestedStack((prev) => {
        const stackKey = prev.map((e) => e.objectId).join(',');
        if (stackKey === pathKey) {
          return prev;
        }

        if (
          pathIds.length <= prev.length &&
          pathIds.every((id, i) => prev[i]?.objectId === id)
        ) {
          return prev.slice(0, pathIds.length);
        }

        needsFetch = true;
        return prev;
      });

      if (!needsFetch || cancelled) {
        return;
      }

      if (pathIds.length === 0) {
        setNestedStack([]);
        return;
      }

      const resolved = await resolveNestedObjectPathAction(pathIds);
      if (cancelled) {
        return;
      }
      setNestedStack(resolved.map(resolvedToEntry));
    })();

    return () => {
      cancelled = true;
    };
  }, [urlPathKey, searchParams]);

  const navigateToDepth = useCallback(
    (depth: number) => {
      setNestedStack((prev) => {
        const next =
          depth < 0 ? [] : prev.slice(0, Math.min(depth + 1, prev.length));
        syncPathToUrl(next, 'push');
        return next;
      });
    },
    [syncPathToUrl],
  );

  const navigateInColumn = useCallback(
    async (item: ProjectedListItem) => {
      const optimistic = pendingEntryFromListItem(item);
      setNestedStack((prev) => {
        const next = [...prev, optimistic];
        syncPathToUrl(next, 'push');
        return next;
      });

      const resolved = await resolveNestedObjectContentAction(item.objectId);
      if (!resolved) {
        setNestedStack((prev) => {
          const next = prev.filter((e) => e.objectId !== item.objectId || !e.pending);
          syncPathToUrl(next, 'replace');
          return next;
        });
        return;
      }

      setNestedStack((prev) => {
        const withoutPending = prev.filter(
          (e) => !(e.objectId === item.objectId && e.pending),
        );
        const withoutDup = withoutPending.filter((e) => e.objectId !== item.objectId);
        const next = [...withoutDup, resolvedToEntry(resolved)];
        syncPathToUrl(next, 'replace');
        return next;
      });
    },
    [syncPathToUrl],
  );

  const currentView = useMemo(() => {
    const top = nestedStack.at(-1);
    if (top) {
      return {
        objectType: top.objectType,
        listItems: top.listItems,
        listItemsSortCustom: top.listItemsSortCustom,
        pageContentHtml: top.pageContentHtml,
        pending: top.pending,
        viewKey: top.objectId,
      };
    }
    if (defaultNestedContent) {
      return {
        objectType: defaultNestedContent.objectType,
        listItems: defaultNestedContent.listItems,
        listItemsSortCustom: defaultNestedContent.listItemsSortCustom,
        pageContentHtml: defaultNestedContent.pageContentHtml,
        pending: false,
        viewKey: defaultNestedContent.objectId,
      };
    }
    return {
      objectType,
      listItems,
      listItemsSortCustom,
      pageContentHtml: null as string | null,
      pending: false,
      viewKey: objectId,
    };
  }, [nestedStack, defaultNestedContent, objectType, listItems, listItemsSortCustom, objectId]);

  const [activeSortType, setActiveSortType] = useState<CatalogListSortOption>(() =>
    resolveListItemCatalogSortType(listItemsSortCustom),
  );

  useEffect(() => {
    setActiveSortType(resolveListItemCatalogSortType(currentView.listItemsSortCustom));
  }, [currentView.viewKey, currentView.listItemsSortCustom]);

  const sortedListItems = useMemo(() => {
    if (currentView.objectType !== 'list') {
      return currentView.listItems;
    }
    return applySortCustomToListItems(
      currentView.listItems,
      overrideSortCustomForSort(currentView.listItemsSortCustom, activeSortType),
    );
  }, [activeSortType, currentView]);

  const renderTypeContent = useCallback((): ReactNode => {
    if (currentView.pending) {
      if (currentView.objectType === 'list') {
        return (
          <ObjectListContent
            items={[]}
            onNavigateInColumn={navigateInColumn}
            pending
            sortCustom={currentView.listItemsSortCustom}
            activeSortType={activeSortType}
            onSortChange={setActiveSortType}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
          />
        );
      }
      return (
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          Loading…
        </div>
      );
    }

    if (currentView.objectType === 'list') {
      return (
        <ObjectListContent
          items={sortedListItems}
          onNavigateInColumn={navigateInColumn}
          sortCustom={currentView.listItemsSortCustom}
          activeSortType={activeSortType}
          onSortChange={setActiveSortType}
          viewerUsername={viewerUsername}
          onRequireLogin={onRequireLogin}
        />
      );
    }

    if (currentView.objectType === 'page') {
      if (nestedStack.length === 0 && objectPageBody) {
        return objectPageBody;
      }
      if (currentView.pageContentHtml) {
        return <ObjectNestedPageBody html={currentView.pageContentHtml} />;
      }
      return (
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="text-fg">This page has no content yet.</p>
        </div>
      );
    }

    const hint = centerHintForKind(currentView.objectType);
    return (
      <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
        <p className="text-fg">
          <span className="font-medium">{title}</span>
          {' — '}
          {hint}
        </p>
        <p className="mt-3 text-muted">{MOCK_FEED_POSTS_HINT}</p>
      </div>
    );
  }, [
    activeSortType,
    currentView,
    navigateInColumn,
    nestedStack.length,
    objectPageBody,
    sortedListItems,
    title,
    viewerUsername,
    onRequireLogin,
  ]);

  if (activePrimarySegment !== REVIEWS_SEGMENT) {
    if (activePrimarySegment === 'authority' && objectAuthorityFeed != null) {
      return (
        <FeedColumn>
          {objectAuthorityFeed}
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'authority') {
      return (
        <FeedColumn>
          <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
            <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
            <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
          </div>
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'followers' && objectFollowersFeed != null) {
      return (
        <FeedColumn>
          {objectFollowersFeed}
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'followers') {
      return (
        <FeedColumn>
          <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
            <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
            <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
          </div>
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'updates' && objectUpdatesFeed != null) {
      return (
        <FeedColumn>
          {objectUpdatesFeed}
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'updates') {
      return (
        <FeedColumn>
          <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
            <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
            <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
          </div>
        </FeedColumn>
      );
    }

    return (
      <FeedColumn>
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
          <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
        </div>
      </FeedColumn>
    );
  }

  const showReviewsExtras =
    currentView.objectType === 'default' &&
    nestedStack.length === 0 &&
    !defaultNestedContent;

  return (
    <FeedColumn>
      {nestedStack.length > 0 ? (
        <ObjectCenterBreadcrumbs
          rootName={title}
          stack={nestedStack.map((e) => ({ objectId: e.objectId, name: e.name }))}
          onNavigateTo={navigateToDepth}
        />
      ) : null}
      {showReviewsExtras ? <ObjectWriteReviewPrompt /> : null}
      {showReviewsExtras && feedSubTabs.length > 0 ? (
        <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
          <ObjectFeedSubNav
            tabs={feedSubTabs}
            activeSegment={activeFeedSubSegment}
            onSelect={onFeedSubSelect}
          />
        </div>
      ) : null}
      {renderTypeContent()}
    </FeedColumn>
  );
}
