'use client';

import Image from 'next/image';

import {
  AVATAR_PLACEHOLDER_SRC,
  shouldUnoptimizeRemoteImage,
} from '@/shared/presentation';

import type { ObjectSidebarMiniCardView } from '../../domain/object-page.types';

export type ObjectSidebarMiniCardProps = {
  item: ObjectSidebarMiniCardView;
};

export function ObjectSidebarMiniCard({ item }: ObjectSidebarMiniCardProps) {
  const src = item.imageSrc?.trim() ? item.imageSrc : AVATAR_PLACEHOLDER_SRC;

  return (
    <div className="flex gap-2 rounded-btn border border-border bg-bg p-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-btn border border-border">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized={
            src === AVATAR_PLACEHOLDER_SRC ? true : shouldUnoptimizeRemoteImage(src)
          }
        />
      </div>
      <p className="min-w-0 flex-1 self-center text-sm font-medium leading-snug text-fg">
        {item.title}
      </p>
    </div>
  );
}

export type ObjectRightSidebarProps = {
  featured: ObjectSidebarMiniCardView[];
  related: ObjectSidebarMiniCardView[];
  similar: ObjectSidebarMiniCardView[];
};

/** Matches profile `RightSidebar` surface tokens (`rounded-card`, `border-border`, `bg-surface/60`). */
export function ObjectRightSidebar({
  featured,
  related,
  similar,
}: ObjectRightSidebarProps) {
  const block = (sectionTitle: string, items: ObjectSidebarMiniCardView[]) => (
    <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
      <p className="font-medium text-fg">{sectionTitle}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <ObjectSidebarMiniCard item={item} />
          </li>
        ))}
      </ul>
    </aside>
  );

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {block('Experts', featured)}
      {block('Nearby', related)}
      {block('Similar', similar)}
    </div>
  );
}
