'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import type { ProjectedMenuItem } from '../../domain/projected-menu-item.types';
import { isMenuInHostTargetType } from '../../domain/object-menu.constants';
import { OBJECT_PAGE_VIEW_PATH_PARAM } from '../../domain/object-page-url.constants';

import { safeHttpUrl } from '@/shared/domain/safe-http-url';
import { OptimisticNavLink, shouldUnoptimizeRemoteImage } from '@/shared/presentation';

export type ObjectMenuItemsStaticProps = {
  items: ProjectedMenuItem[];
  /** Current object page id — menu targets open under this host via `?path=`. */
  hostObjectId: string;
  /**
   * When set, in-host menu link for this target uses clean `/object/:host` (SSR default nested)
   * instead of `?path=` — matches default landing without changing the URL.
   */
  defaultNestedTargetId?: string | null;
};

function itemKey(item: ProjectedMenuItem, index: number): string {
  return `${item.displayTitle}-${item.link_to_object ?? ''}-${item.link_to_web ?? ''}-${index}`;
}

function objectHref(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}`;
}

function menuObjectHref(
  item: ProjectedMenuItem,
  hostObjectId: string,
): string {
  const targetId = item.link_to_object?.trim();
  if (!targetId) {
    return objectHref(hostObjectId);
  }
  const type = item.object_type ?? item.object?.object_type;
  if (isMenuInHostTargetType(type) && targetId !== hostObjectId) {
    const u = new URLSearchParams();
    u.set(OBJECT_PAGE_VIEW_PATH_PARAM, targetId);
    return `${objectHref(hostObjectId)}?${u.toString()}`;
  }
  return objectHref(targetId);
}

/**
 * Waivio-style menu rows with navigation.
 * @see tmp/waivio-frontend-legacy/src/client/app/Sidebar/MenuItemButtons/MenuItemButton.js
 */
export function ObjectMenuItemsStatic({
  items,
  hostObjectId,
}: ObjectMenuItemsStaticProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={itemKey(item, index)} className="min-w-0">
          <MenuItemNavWrapper
            item={item}
            hostObjectId={hostObjectId}
          >
            <MenuItemVisual item={item} />
          </MenuItemNavWrapper>
        </div>
      ))}
    </div>
  );
}

function MenuItemNavWrapper({
  item,
  hostObjectId,
  children,
}: {
  item: ProjectedMenuItem;
  hostObjectId: string;
  defaultNestedTargetId?: string | null;
  children: ReactNode;
}) {
  if (item.link_to_object) {
    return (
      <OptimisticNavLink
        href={menuObjectHref(item, hostObjectId)}
        method="push"
        className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {children}
      </OptimisticNavLink>
    );
  }

  if (item.link_to_web) {
    const webHref = safeHttpUrl(item.link_to_web);
    if (!webHref) {
      return <>{children}</>;
    }
    return (
      <a
        href={webHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        suppressHydrationWarning
      >
        {children}
      </a>
    );
  }

  return <>{children}</>;
}

function MenuItemVisual({ item }: { item: ProjectedMenuItem }) {
  const isHighlight = item.style === 'highlight';

  if (item.style === 'image' && item.image) {
    return (
      <span className="block w-full overflow-hidden rounded-btn border border-border bg-surface">
        <Image
          src={item.image}
          alt=""
          width={270}
          height={120}
          className="h-auto max-h-28 w-full object-cover"
          unoptimized={shouldUnoptimizeRemoteImage(item.image)}
        />
        <span className="sr-only">{item.displayTitle}</span>
      </span>
    );
  }

  if (item.style === 'icon' && item.image) {
    return (
      <span className="flex min-w-0 items-center justify-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-center text-body-sm font-weight-label text-fg hover:bg-surface-alt">
        <Image
          src={item.image}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
          unoptimized={shouldUnoptimizeRemoteImage(item.image)}
        />
        <span className="truncate">{item.displayTitle}</span>
      </span>
    );
  }

  return (
    <span
      className={`block w-full truncate rounded-btn border px-3 py-2 text-center text-body-sm font-weight-label ${
        isHighlight
          ? 'border-accent-alt bg-accent-alt text-accent-fg hover:opacity-95'
          : 'border-border bg-surface text-fg hover:bg-surface-alt'
      }`}
    >
      {item.displayTitle}
    </span>
  );
}
