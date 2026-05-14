'use client';

import Image from 'next/image';

import type { ProjectedMenuItem } from '../../domain/projected-menu-item.types';

import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

export type ObjectMenuItemsStaticProps = {
  items: ProjectedMenuItem[];
};

function itemKey(item: ProjectedMenuItem, index: number): string {
  return `${item.displayTitle}-${item.link_to_object ?? ''}-${item.link_to_web ?? ''}-${index}`;
}

/**
 * Waivio-style menu rows — display only (no navigation).
 * @see tmp/waivio-frontend-legacy/src/client/app/Sidebar/MenuItemButtons/MenuItemButton.js
 */
export function ObjectMenuItemsStatic({ items }: ObjectMenuItemsStaticProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={itemKey(item, index)} className="min-w-0">
          <MenuItemVisual item={item} />
        </div>
      ))}
    </div>
  );
}

function MenuItemVisual({ item }: { item: ProjectedMenuItem }) {
  const isHighlight = item.style === 'highlight';

  if (item.style === 'image' && item.image) {
    return (
      <button
        type="button"
        className="block w-full overflow-hidden rounded-btn border border-border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Image
          src={item.image}
          alt=""
          width={270}
          height={120}
          className="h-auto max-h-28 w-full object-cover"
          unoptimized={shouldUnoptimizeRemoteImage(item.image)}
        />
        <span className="sr-only">{item.displayTitle}</span>
      </button>
    );
  }

  if (item.style === 'icon' && item.image) {
    return (
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 rounded-btn border border-border bg-surface px-3 py-2 text-left text-sm font-medium text-fg hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Image
          src={item.image}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
          unoptimized={shouldUnoptimizeRemoteImage(item.image)}
        />
        <span className="truncate">{item.displayTitle}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`w-full truncate rounded-btn border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isHighlight
          ? 'border-accent-alt bg-accent-alt text-white hover:opacity-95'
          : 'border-border bg-surface text-fg hover:bg-surface-alt'
      }`}
    >
      {item.displayTitle}
    </button>
  );
}
