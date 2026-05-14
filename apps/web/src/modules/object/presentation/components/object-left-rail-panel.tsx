'use client';

import { useId, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { ObjectLeftRailBlock } from '../../domain/object-page.types';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import { ObjectGeoPreview } from './object-geo-preview';
import { ObjectMenuItemsStatic } from './object-menu-items-static';

export type ObjectLeftRailPanelProps = {
  blocks: ObjectLeftRailBlock[];
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

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={filled ? 'text-accent-alt' : 'text-fg-disabled'}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        opacity={filled ? 1 : 0.25}
      />
    </svg>
  );
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

function LeftRailIdentifierSection({
  cardClass,
  headingLabel,
  rows,
}: {
  cardClass: string;
  headingLabel: string;
  rows: { type: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <aside className={cardClass}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-sm font-medium text-muted transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded-sm"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{headingLabel}</span>
        <ChevronAccordion expanded={open} />
      </button>
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

export function ObjectLeftRailPanel({ blocks }: ObjectLeftRailPanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {blocks.map((block, index) => {
        const cardClass =
          'rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted';

        switch (block.kind) {
          case 'menuItems':
            return (
              <aside key={`menu-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3">
                  <ObjectMenuItemsStatic items={block.items} />
                </div>
              </aside>
            );
          case 'parent':
            return (
              <aside key={`parent-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <Link
                  href={`/object/${encodeURIComponent(block.objectId)}`}
                  prefetch={false}
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
              </aside>
            );
          case 'description': {
            const intro = truncateIntroForPreview(block.text);
            return (
              <aside key={`desc-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                {intro.display ? (
                  <p
                    className="mt-2 leading-relaxed"
                    title={intro.isTruncated ? block.text.trim() : undefined}
                  >
                    {intro.display}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="mt-3 rounded-btn border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface"
                >
                  {t('object_detail_description_button')}
                </button>
              </aside>
            );
          }
          case 'rating': {
            return (
              <aside key={`rating-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <ul className="mt-3 list-none space-y-4 p-0">
                  {block.aspects.map((aspect, aspectIndex) => {
                    const avg = aspect.averageRating01To5;
                    const roundedAvgStars =
                      avg != null ? Math.min(5, Math.max(0, Math.round(avg))) : null;
                    const viewer = aspect.viewerRating01To5;
                    const roundedViewerStars =
                      viewer != null
                        ? Math.min(5, Math.max(0, Math.round(viewer)))
                        : null;
                    const avgLabel =
                      avg != null ? `${aspect.dimension}: ${avg.toFixed(1)}` : `${aspect.dimension}: —`;
                    return (
                      <li key={`${aspect.dimension}-${aspectIndex}`} className="min-w-0">
                        <p
                          className="truncate font-medium leading-snug text-fg"
                          title={aspect.dimension}
                        >
                          {aspect.dimension}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-0.5" role="img" aria-label={avgLabel}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <IconStar
                                key={i}
                                filled={roundedAvgStars !== null ? i < roundedAvgStars : false}
                              />
                            ))}
                          </span>
                          {avg != null ? (
                            <span className="tabular-nums">{avg.toFixed(1)}</span>
                          ) : null}
                          <span className="tabular-nums text-muted">
                            ({aspect.totalVoters})
                          </span>
                        </div>
                        {viewer != null ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                            <span
                              className="inline-flex items-center gap-0.5 opacity-95"
                              role="img"
                              aria-label={`Your rating (${aspect.dimension}): ${viewer.toFixed(1)}`}
                            >
                              {Array.from({ length: 5 }, (_, i) => (
                                <IconStar
                                  key={i}
                                  filled={roundedViewerStars !== null ? i < roundedViewerStars : false}
                                />
                              ))}
                            </span>
                            <span className="tabular-nums text-caption text-muted">{viewer.toFixed(1)}</span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </aside>
            );
          }
          case 'tags':
            return (
              <aside key={`tags-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3 space-y-4">
                  {block.sections.map((section) => (
                    <div key={section.categoryTitle}>
                      <p className="text-fg text-sm font-normal">
                        {section.categoryTitle}:
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {section.values.map((tag) => (
                          <span
                            key={`${section.categoryTitle}-${tag}`}
                            className="rounded-btn bg-surface px-2 py-1 text-caption text-fg"
                          >
                            {tag}
                          </span>
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
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {block.urls.slice(0, 4).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-btn border border-border"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized={shouldUnoptimizeRemoteImage(src)}
                      />
                    </div>
                  ))}
                </div>
              </aside>
            );
          case 'price':
            return (
              <aside key={`price-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{block.text}</p>
              </aside>
            );
          case 'geo':
            return (
              <aside key={`geo-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3 overflow-hidden rounded-btn">
                  <ObjectGeoPreview
                    latitude={block.latitude}
                    longitude={block.longitude}
                    label={block.headingLabel}
                  />
                </div>
              </aside>
            );
          case 'websites':
            return (
              <aside key={`web-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <p className="mt-2 break-all">{block.address}</p>
              </aside>
            );
          case 'walletAddress':
            return (
              <aside key={`wallet-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
              />
            );
          case 'link':
            return (
              <aside key={`link-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
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
    </div>
  );
}
