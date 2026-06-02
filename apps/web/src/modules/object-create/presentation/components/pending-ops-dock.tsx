'use client';

import { useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { formatBroadcastJsonBytes } from '../../domain/format-broadcast-json-size';
import {
  summarizePendingOps,
  type PendingOpsCategory,
} from '../../domain/summarize-pending-ops';
import type { FieldEntry } from '../../domain/object-create.types';

const CATEGORY_ORDER: readonly PendingOpsCategory[] = [
  'identity',
  'relations',
  'metadata',
];

const CATEGORY_I18N: Record<PendingOpsCategory, string> = {
  identity: 'object_create_dim_identity',
  relations: 'object_create_dim_relations',
  metadata: 'object_create_dock_category_metadata',
};

/** Mirrors `AppHeader` + `TopNav` chrome (not the search input). */
const NAV_BACKDROP_STYLE = { backdropFilter: 'var(--backdrop-nav)' } as const;

export type PendingOpsDockProps = {
  fields: readonly FieldEntry[];
  canPublish: boolean;
  submitting?: boolean;
  disabled?: boolean;
  broadcastViaIpfs?: boolean;
  onToggleBroadcastViaIpfs?: () => void;
  publishPhase?: 'idle' | 'uploading' | 'signing' | 'confirming' | 'importing';
  /** Full ODL envelope size in UTF-8 bytes. */
  jsonBytes?: number;
  /** Number of `custom_json` ops for direct chain broadcast. */
  opCount?: number;
  onPublish: () => void;
};

export function PendingOpsDock({
  fields,
  canPublish,
  submitting = false,
  disabled = false,
  broadcastViaIpfs = false,
  onToggleBroadcastViaIpfs,
  publishPhase = 'idle',
  jsonBytes,
  opCount,
  onPublish,
}: PendingOpsDockProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => summarizePendingOps(fields), [fields]);

  if (summary.total === 0) {
    return null;
  }

  const busy = disabled || submitting;

  const categorySummary = CATEGORY_ORDER.flatMap((id) => {
    const count = summary.byCategory[id];
    if (count === 0) {
      return [];
    }
    return `${t(CATEGORY_I18N[id])}(${count})`;
  }).join(' ');

  const readyLine = t('object_create_dock_ready').replace(
    '{n}',
    String(summary.total),
  );

  const broadcastSizeLine =
    jsonBytes !== undefined
      ? broadcastViaIpfs
        ? t('object_create_broadcast_size_ipfs').replace(
            '{size}',
            formatBroadcastJsonBytes(jsonBytes),
          )
        : t('object_create_broadcast_size_direct')
            .replace('{size}', formatBroadcastJsonBytes(jsonBytes))
            .replace('{n}', String(opCount ?? 1))
      : null;

  const broadcastSizeNearLimit =
    !broadcastViaIpfs && opCount !== undefined && opCount >= 4;

  const publishLabel = (() => {
    if (!submitting) {
      return t('object_create_publish');
    }
    if (!broadcastViaIpfs) {
      switch (publishPhase) {
        case 'confirming':
          return t('object_create_confirming_on_chain');
        case 'importing':
          return t('object_create_indexing_object');
        default:
          return t('object_create_publishing');
      }
    }
    switch (publishPhase) {
      case 'uploading':
        return t('object_create_uploading_to_ipfs');
      case 'signing':
        return t('object_create_awaiting_signature');
      case 'confirming':
        return t('object_create_confirming_on_chain');
      case 'importing':
        return t('object_create_importing_via_ipfs');
      default:
        return t('object_create_importing_via_ipfs');
    }
  })();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-gutter sm:px-gutter-sm"
      role="region"
      aria-label={t('object_create_dock_region')}
    >
      <div
        className="w-full max-w-container-page border-t border-border bg-nav-bg"
        style={NAV_BACKDROP_STYLE}
      >
        <div className="flex min-h-shell-header flex-wrap items-center gap-2 px-gutter py-2 sm:px-gutter-sm lg:flex-nowrap">
          <p className="shrink-0 text-body-sm font-medium text-fg">{readyLine}</p>

          <div className="min-w-0 flex-1 truncate text-caption text-fg-secondary">
            {categorySummary ? (
              <p className="truncate" title={categorySummary}>
                {categorySummary}
              </p>
            ) : null}
            {broadcastSizeLine ? (
              <p
                className={
                  broadcastSizeNearLimit
                    ? 'truncate text-warning'
                    : 'truncate text-muted'
                }
                title={broadcastSizeLine}
              >
                {broadcastSizeLine}
              </p>
            ) : null}
            {!categorySummary && !broadcastSizeLine ? (
              <span className="sr-only" aria-hidden />
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {onToggleBroadcastViaIpfs ? (
              <label className="flex cursor-pointer items-center gap-1.5 text-caption text-muted">
                <input
                  type="checkbox"
                  checked={broadcastViaIpfs}
                  disabled={busy}
                  onChange={onToggleBroadcastViaIpfs}
                  className="rounded border-border"
                />
                {t('object_create_broadcast_via_ipfs')}
              </label>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => setExpanded((e) => !e)}
              className="rounded-btn border border-border bg-secondary px-3 py-1.5 font-label text-body-sm text-secondary-fg hover:bg-tertiary disabled:opacity-50"
              aria-expanded={expanded}
              aria-controls="object-create-pending-ops-list"
            >
              {expanded
                ? t('object_create_dock_collapse')
                : t('object_create_dock_review')}
            </button>
            <button
              type="button"
              disabled={!canPublish || busy}
              onClick={() => onPublish()}
              className="rounded-btn bg-accent px-3 py-1.5 font-label text-body-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
            >
              {publishLabel}
            </button>
          </div>
        </div>

        {expanded ? (
          <div
            id="object-create-pending-ops-list"
            className="max-h-56 overflow-y-auto border-t border-border px-gutter pb-3 sm:px-gutter-sm"
          >
            <ul className="space-y-1 pt-2 font-mono text-caption">
              {summary.ops.map((op) => (
                <li
                  key={op.key}
                  className="flex gap-2 rounded-btn px-2 py-1.5 hover:bg-ghost-surface"
                >
                  <span className="shrink-0 text-accent">+</span>
                  <span className="shrink-0 font-medium text-fg">{op.opLabel}</span>
                  <span className="min-w-0 truncate text-muted" title={op.preview}>
                    {op.preview}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
