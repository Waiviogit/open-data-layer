'use client';

import { useId, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { buildDiscoverHref, encodeTagFilter } from '@/modules/discover/domain/discover-url';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import {
  BLOCK_KIND_TO_UPDATE_TYPES,
  getUpdateTypesForBlockKind,
  primaryUpdateTypeForBlockKind,
  type ObjectLeftRailBlockKind,
} from '@/modules/object-updates/domain/block-update-type-map';
import { mergeLeftRailBlocksForEditMode } from '@/modules/object-updates/domain/left-rail-edit-blocks';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import type { ObjectLeftRailBlock, ProjectedGalleryAlbumView } from '../../domain/object-page.types';

import { ObjectGalleryCarousel } from './object-gallery-carousel';
import { ObjectGalleryViewer } from './object-gallery-viewer';
import { LeftRailUpdateCountBadge } from './left-rail-update-count-badge';
import { ObjectGeoPreview } from './object-geo-preview';
import { ObjectMenuItemsStatic } from './object-menu-items-static';
import { StarRating } from './star-rating';

export type ObjectLeftRailEditContext = {
  objectId: string;
  viewerUsername: string;
  supportedUpdateTypes: readonly string[];
  /** Existing `tagCategory` names on the object (for `tagCategoryItem` picker). */
  tagCategoryNames: readonly string[];
  /** Per-type update row counts from object resolve. */
  updateTypeCounts: Record<string, number>;
};

function countForBlockKind(
  kind: ObjectLeftRailBlockKind,
  counts: Record<string, number>,
): number {
  return (
    BLOCK_KIND_TO_UPDATE_TYPES[kind]?.reduce(
      (sum, updateType) => sum + (counts[updateType] ?? 0),
      0,
    ) ?? 0
  );
}

export type ObjectLeftRailPanelProps = {
  blocks: ObjectLeftRailBlock[];
  /** Registry `object_type` key (e.g. `recipe`) for discover links from tag chips. */
  objectTypeKey: string;
  editContext?: ObjectLeftRailEditContext;
  objectId: string;
  /** SSR default nested target — menu link stays on clean `/object/:id`. */
  defaultNestedTargetId?: string | null;
  /** Show Description link when text or gallery preview exists. */
  canOpenDescriptionPage?: boolean;
  objectName?: string;
  /** Photos album for left-rail carousel full-screen viewer. */
  galleryPhotosAlbum?: ProjectedGalleryAlbumView | null;
  supportedUpdateTypes?: readonly string[];
  updateTypeCounts?: Record<string, number>;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

/** Max characters for description preview card (matches legacy sidebar truncation). */
const OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS = 250;

function truncateIntroForPreview(text: string): { display: string; isTruncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { display: '', isTruncated: false };
  }
  if (trimmed.length <= OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS) {
    return { display: trimmed, isTruncated: false };
  }
  const clipped = trimmed
    .slice(0, OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS)
    .trimEnd();
  return { display: `${clipped}...`, isTruncated: true };
}

function ChevronAccordion({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 text-muted transition-transform duration-200 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : 'rotate-0'}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconAddUpdate({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LeftRailAddUpdateButton({
  onClick,
  addLabel,
}: {
  onClick: () => void;
  addLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-accent bg-accent/10 text-accent hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      aria-label={addLabel}
      title={addLabel}
    >
      <IconAddUpdate className="block shrink-0" />
    </button>
  );
}

function LeftRailBlockHeading({
  label,
  onAdd,
  addLabel,
  count,
}: {
  label: string;
  onAdd?: () => void;
  addLabel: string;
  /** Existing update rows for this block (edit mode only). */
  count?: number;
}) {
  if (!onAdd) {
    return <p className="font-medium text-fg">{label}</p>;
  }
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{label}</p>
        {count != null ? (
          <div className="mt-1">
            <LeftRailUpdateCountBadge count={count} />
          </div>
        ) : null}
      </div>
      <LeftRailAddUpdateButton onClick={onAdd} addLabel={addLabel} />
    </div>
  );
}

function LeftRailIdentifierSection({
  cardClass,
  headingLabel,
  rows,
  onAdd,
  addLabel,
  count,
}: {
  cardClass: string;
  headingLabel: string;
  rows: { type: string; value: string }[];
  onAdd?: () => void;
  addLabel: string;
  count?: number;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <aside className={cardClass}>
      <div className="flex w-full min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <button
            type="button"
            className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-sm font-medium text-muted transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded-sm"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="min-w-0 truncate">{headingLabel}</span>
            <ChevronAccordion expanded={open} />
          </button>
          {onAdd && count != null ? <LeftRailUpdateCountBadge count={count} /> : null}
        </div>
        {onAdd ? <LeftRailAddUpdateButton onClick={onAdd} addLabel={addLabel} /> : null}
      </div>
      {open ? (
        <div id={contentId} className="mt-3 space-y-4">
          {rows.map((row, i) => (
            <div key={`${row.type}-${row.value}-${i}`}>
              <p className="text-sm font-medium uppercase tracking-wide text-fg">{row.type}</p>
              <p className="mt-1 tabular-nums text-sm leading-snug text-fg">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

type AddUpdateModalState = {
  candidateUpdateTypes: string[];
  initialUpdateType?: string;
};

export function ObjectLeftRailPanel({
  blocks,
  objectTypeKey,
  editContext,
  objectId,
  defaultNestedTargetId = null,
  canOpenDescriptionPage = false,
  objectName = '',
  galleryPhotosAlbum = null,
  supportedUpdateTypes = [],
  updateTypeCounts,
  viewerUsername,
  onRequireLogin,
}: ObjectLeftRailPanelProps) {
  const { t } = useI18n();
  const [addModal, setAddModal] = useState<AddUpdateModalState | null>(null);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState<number | null>(null);

  const displayBlocks = useMemo(() => {
    if (!editContext) {
      return blocks.filter((b) => b.kind !== 'name' && b.kind !== 'title');
    }
    return mergeLeftRailBlocksForEditMode(blocks, editContext.supportedUpdateTypes);
  }, [blocks, editContext]);

  const addLabel = t('object_edit_add_update');

  function openAddModal(kind: ObjectLeftRailBlockKind) {
    if (!editContext) {
      return;
    }
    const candidateUpdateTypes = getUpdateTypesForBlockKind(
      kind,
      editContext.supportedUpdateTypes,
    );
    if (candidateUpdateTypes.length === 0) {
      return;
    }
    const initialUpdateType = primaryUpdateTypeForBlockKind(
      kind,
      editContext.supportedUpdateTypes,
    );
    setAddModal({ candidateUpdateTypes, initialUpdateType });
  }

  function makeOnAdd(kind: ObjectLeftRailBlockKind) {
    if (!editContext) {
      return undefined;
    }
    return () => openAddModal(kind);
  }

  function railBlockCount(kind: ObjectLeftRailBlockKind): number | undefined {
    if (!editContext) {
      return undefined;
    }
    return countForBlockKind(kind, editContext.updateTypeCounts);
  }

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {editContext && addModal ? (
        <AddUpdateModal
          open
          mode="leftRail"
          onClose={() => setAddModal(null)}
          objectId={editContext.objectId}
          viewerUsername={editContext.viewerUsername}
          candidateUpdateTypes={addModal.candidateUpdateTypes}
          initialUpdateType={addModal.initialUpdateType}
          tagCategoryNames={editContext.tagCategoryNames}
          updateTypeCounts={editContext.updateTypeCounts}
        />
      ) : null}
      {displayBlocks.map((block, index) => {
        const cardClass =
          'rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted';

        switch (block.kind) {
          case 'menuItems':
            return (
              <aside key={`menu-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('menuItems')}
                  addLabel={addLabel}
                  count={railBlockCount('menuItems')}
                />
                <div className="mt-3">
                  <ObjectMenuItemsStatic
                    items={block.items}
                    hostObjectId={objectId}
                    defaultNestedTargetId={defaultNestedTargetId}
                  />
                </div>
              </aside>
            );
          case 'name':
            return (
              <aside key={`name-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('name')}
                  addLabel={addLabel}
                  count={railBlockCount('name')}
                />
                {block.text.trim() ? (
                  <p className="mt-2 font-medium text-fg">{block.text}</p>
                ) : null}
              </aside>
            );
          case 'title':
            return (
              <aside key={`title-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('title')}
                  addLabel={addLabel}
                  count={railBlockCount('title')}
                />
                {block.text.trim() ? (
                  <p className="mt-2 text-fg">{block.text}</p>
                ) : null}
              </aside>
            );
          case 'parent':
            return (
              <aside key={`parent-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('parent')}
                  addLabel={addLabel}
                  count={railBlockCount('parent')}
                />
                {block.objectId.trim() ? (
                  <Link
                    href={`/object/${encodeURIComponent(block.objectId)}`}
                    prefetch={false}
                    suppressHydrationWarning
                    className="mt-3 -mx-1 -my-1 flex min-w-0 items-center gap-2.5 rounded-btn p-1 transition-colors hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-btn border border-border bg-surface">
                      {block.imageUrl ? (
                        <Image
                          src={block.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized={shouldUnoptimizeRemoteImage(block.imageUrl)}
                        />
                      ) : (
                        <div
                          className="flex size-full items-center justify-center bg-surface-alt text-micro text-muted"
                          aria-hidden
                        >
                          —
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 break-words text-accent">{block.name}</span>
                  </Link>
                ) : null}
              </aside>
            );
          case 'description': {
            const intro = truncateIntroForPreview(block.text);
            return (
              <aside key={`desc-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('description')}
                  addLabel={addLabel}
                  count={railBlockCount('description')}
                />
                {intro.display ? (
                  <p
                    className="mt-2 leading-relaxed"
                    title={intro.isTruncated ? block.text.trim() : undefined}
                  >
                    {intro.display}
                  </p>
                ) : null}
                {intro.display ? (
                  <Link
                    href={`/object/${encodeURIComponent(objectId)}/description`}
                    className="mt-3 inline-block rounded-btn border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    suppressHydrationWarning
                  >
                    {t('object_detail_description_button')}
                  </Link>
                ) : canOpenDescriptionPage ? (
                  <Link
                    href={`/object/${encodeURIComponent(objectId)}/description`}
                    className="mt-3 inline-block rounded-btn border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    suppressHydrationWarning
                  >
                    {t('object_detail_description_button')}
                  </Link>
                ) : null}
              </aside>
            );
          }
          case 'rating': {
            return (
              <aside key={`rating-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('rating')}
                  addLabel={addLabel}
                  count={railBlockCount('rating')}
                />
                <ul className="mt-3 list-none space-y-4 p-0">
                  {block.aspects.map((aspect, aspectIndex) => (
                    <li key={`${aspect.update_id}-${aspectIndex}`} className="min-w-0">
                      <p
                        className="truncate font-medium leading-snug text-fg"
                        title={aspect.dimension}
                      >
                        {aspect.dimension}
                      </p>
                      <div className="mt-1.5">
                        <StarRating
                          averageRating01To5={aspect.averageRating01To5}
                          userRating01To5={aspect.viewerRating01To5}
                          totalVoters={aspect.totalVoters}
                          dimension={aspect.dimension}
                          updateId={aspect.update_id}
                          objectId={objectId}
                          viewerUsername={viewerUsername}
                          onRequireLogin={onRequireLogin}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </aside>
            );
          }
          case 'tags':
            return (
              <aside key={`tags-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('tags')}
                  addLabel={addLabel}
                  count={railBlockCount('tags')}
                />
                <div className="mt-3 space-y-4">
                  {block.sections.map((section) => (
                    <div key={section.categoryTitle}>
                      <p className="text-fg text-sm font-normal">
                        {section.categoryTitle}:
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {section.values.map((tag) => (
                          <Link
                            key={`${section.categoryTitle}-${tag}`}
                            href={buildDiscoverHref({
                              type: objectTypeKey,
                              tags: [encodeTagFilter(section.categoryTitle, tag)],
                            })}
                            prefetch={false}
                            className="rounded-btn bg-surface px-2 py-1 text-caption text-fg transition-colors hover:bg-ghost-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            aria-label={t('object_tag_discover_aria')
                              .replace('{category}', section.categoryTitle)
                              .replace('{tag}', tag)}
                            suppressHydrationWarning
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            );
          case 'gallery':
            return (
              <aside key={`gallery-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('gallery')}
                  addLabel={addLabel}
                  count={railBlockCount('gallery')}
                />
                <ObjectGalleryCarousel
                  photos={block.photos}
                  onPhotoClick={
                    galleryPhotosAlbum && galleryPhotosAlbum.items.length > 0
                      ? (index) => {
                          const url = block.photos[index]?.url;
                          const albumIndex =
                            url != null
                              ? galleryPhotosAlbum.items.findIndex((item) => item.url === url)
                              : -1;
                          setGalleryViewerIndex(albumIndex >= 0 ? albumIndex : index);
                        }
                      : undefined
                  }
                />
              </aside>
            );
          case 'price':
            return (
              <aside key={`price-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('price')}
                  addLabel={addLabel}
                  count={railBlockCount('price')}
                />
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-muted" aria-hidden>
                    $
                  </span>
                  <span className="font-semibold tabular-nums text-fg">{block.text}</span>
                </div>
              </aside>
            );
          case 'workHours':
            return (
              <aside key={`hours-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('workHours')}
                  addLabel={addLabel}
                  count={railBlockCount('workHours')}
                />
                <ul className="mt-2 space-y-1">
                  {block.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </aside>
            );
          case 'address':
            return (
              <aside key={`addr-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('address')}
                  addLabel={addLabel}
                  count={railBlockCount('address')}
                />
                <p className="mt-2 whitespace-pre-line leading-relaxed">{block.text}</p>
              </aside>
            );
          case 'geo': {
            const hasCoords =
              block.latitude != null &&
              block.longitude != null &&
              Number.isFinite(block.latitude) &&
              Number.isFinite(block.longitude);
            return (
              <aside key={`geo-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('geo')}
                  addLabel={addLabel}
                  count={railBlockCount('geo')}
                />
                {hasCoords ? (
                  <div className="mt-3 overflow-hidden rounded-btn">
                    <ObjectGeoPreview
                      latitude={block.latitude!}
                      longitude={block.longitude!}
                      label={block.headingLabel}
                    />
                  </div>
                ) : null}
              </aside>
            );
          }
          case 'websites':
            return (
              <aside key={`web-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('websites')}
                  addLabel={addLabel}
                  count={railBlockCount('websites')}
                />
                <ul className="mt-2 space-y-2">
                  {block.entries.map((entry) => (
                    <li key={`${entry.link}-${entry.title}`} className="flex items-start gap-2">
                      <img
                        src="/images/icons/link-icon.svg"
                        alt=""
                        width={16}
                        height={16}
                        className="mt-0.5 shrink-0 opacity-80"
                      />
                      <span className="break-all text-fg">{entry.title}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            );
          case 'phones':
            return (
              <aside key={`phones-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('phones')}
                  addLabel={addLabel}
                  count={railBlockCount('phones')}
                />
                <ul className="mt-2 space-y-1 tabular-nums">
                  {block.numbers.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </aside>
            );
          case 'email':
            return (
              <aside key={`email-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('email')}
                  addLabel={addLabel}
                  count={railBlockCount('email')}
                />
                <p className="mt-2 break-all">{block.address}</p>
              </aside>
            );
          case 'walletAddress':
            return (
              <aside key={`wallet-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('walletAddress')}
                  addLabel={addLabel}
                  count={railBlockCount('walletAddress')}
                />
                <ul className="mt-3 list-none space-y-2 p-0">
                  {block.items.map((row, rowIndex) => (
                    <li key={`${row.lineText}-${rowIndex}`} className="flex gap-2">
                      <div
                        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-btn border border-border/80 bg-external-brand-well backdrop-blur-sm shadow-inset"
                        aria-hidden
                      >
                        <img
                          src={row.iconSrc}
                          alt=""
                          width={22}
                          height={22}
                          className="size-[22px] object-contain"
                        />
                      </div>
                      <span className="min-w-0 flex-1 break-words leading-snug text-accent">
                        {row.lineText}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            );
          case 'identifier':
            return (
              <LeftRailIdentifierSection
                key={`identifier-${index}`}
                cardClass={cardClass}
                headingLabel={block.headingLabel}
                rows={block.rows}
                onAdd={makeOnAdd('identifier')}
                addLabel={addLabel}
                count={railBlockCount('identifier')}
              />
            );
          case 'link':
            return (
              <aside key={`link-${index}`} className={cardClass}>
                <LeftRailBlockHeading
                  label={block.headingLabel}
                  onAdd={makeOnAdd('link')}
                  addLabel={addLabel}
                  count={railBlockCount('link')}
                />
                <ul className="mt-3 list-none space-y-2 p-0">
                  {block.items.map((row, rowIndex) => (
                    <li key={`${row.label}-${rowIndex}`} className="flex items-center gap-2">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-btn border border-border/80 bg-external-brand-well backdrop-blur-sm shadow-inset"
                        aria-hidden
                      >
                        <img
                          src={row.iconSrc}
                          alt=""
                          width={22}
                          height={22}
                          className="size-[22px] object-contain"
                        />
                      </div>
                      <span className="text-accent">{row.label}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            );
          default: {
            const _never: never = block;
            return _never;
          }
        }
      })}
      {galleryPhotosAlbum && galleryViewerIndex != null ? (
        <ObjectGalleryViewer
          objectId={objectId}
          objectName={objectName}
          album={galleryPhotosAlbum}
          initialIndex={galleryViewerIndex}
          onClose={() => setGalleryViewerIndex(null)}
          viewerUsername={viewerUsername ?? null}
          onRequireLogin={() => onRequireLogin?.()}
          supportedUpdateTypes={supportedUpdateTypes}
          updateTypeCounts={updateTypeCounts}
        />
      ) : null}
    </div>
  );
}
