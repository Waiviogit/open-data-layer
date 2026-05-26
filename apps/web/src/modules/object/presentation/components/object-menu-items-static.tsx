'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ProjectedMenuItem } from '../../domain/projected-menu-item.types';
import { OBJECT_PAGE_VIEW_PATH_PARAM } from '../../domain/object-page-url.constants';

import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

/** Object types that open in the host object's center column (legacy menuList/menuPage). */
const MENU_IN_HOST_TYPES = new Set([
  'list',
  'page',
  'html',
  'newsfeed',
  'widget',
  'webpage',
  'map',
]);

export type ObjectMenuItemsStaticProps = {
  items: ProjectedMenuItem[];
  /** Current object page id — menu targets open under this host via `?path=`. */
  hostObjectId: string;
};

function itemKey(item: ProjectedMenuItem, index: number): string {
  return `${item.displayTitle}-${item.link_to_object ?? ''}-${item.link_to_web ?? ''}-${index}`;
}

function objectHref(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}`;
}

function menuObjectHref(item: ProjectedMenuItem, hostObjectId: string): string {
  const targetId = item.link_to_object?.trim();
  if (!targetId) {
    return objectHref(hostObjectId);
  }
  const type = (item.object_type ?? item.object?.object_type ?? '').trim();
  if (MENU_IN_HOST_TYPES.has(type) && targetId !== hostObjectId) {
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
export function ObjectMenuItemsStatic({ items, hostObjectId }: ObjectMenuItemsStaticProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={itemKey(item, index)} className="min-w-0">
          <MenuItemNavWrapper item={item} hostObjectId={hostObjectId}>
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
  children: ReactNode;
}) {
  if (item.link_to_object) {
    return (
      <Link
        href={menuObjectHref(item, hostObjectId)}
        className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {children}
      </Link>
    );
  }

  if (item.link_to_web) {
    return (
      <a
        href={item.link_to_web}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      <span className="flex min-w-0 items-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-left text-sm font-medium text-fg hover:bg-surface-alt">
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
      className={`block w-full truncate rounded-btn border px-3 py-2 text-sm font-medium ${
        isHighlight
          ? 'border-accent-alt bg-accent-alt text-white hover:opacity-95'
          : 'border-border bg-surface text-fg hover:bg-surface-alt'
      }`}
    >
      {item.displayTitle}
    </span>
  );
}
