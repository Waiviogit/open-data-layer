'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import {
  buildOdlUpdateCreateOp,
  buildOdlUpdateVoteOp,
} from '@opden-data-layer/hive-broadcast';

import { fetchTagApprovalStatsAction } from '@/app/(app)/object/[object-id]/tag-approval.actions';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { PlusIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { buildDiscoverHref, encodeTagFilter } from '@/modules/discover/domain/discover-url';
import { broadcastOdlOpWithOverflow } from '@/modules/object-updates/application/broadcast-odl-op-with-overflow';
import { broadcastOverflowErrorMessage } from '@/modules/object-updates/application/broadcast-overflow-error-message';
import type { TagApprovalStatsIndex } from '@/modules/object/domain/tag-approval-stats';
import { resolveTagApprovalStat } from '@/modules/object/domain/tag-approval-stats';
import type { TagCategorySectionView } from '@/modules/object/infrastructure/object-projected-fields';
import { mergeTagCategorySectionsForEditMode } from '@/modules/object/infrastructure/object-projected-fields';
import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';
import { TagChip } from '@/modules/object-updates/presentation/components/tag-chip';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

import { LeftRailUpdateCountBadge } from './left-rail-update-count-badge';

function tagOptimisticKey(category: string, value: string): string {
  return `${category}\0${value}`;
}

export type ObjectTagsLeftRailSectionProps = {
  headingLabel: string;
  sections: TagCategorySectionView[];
  objectTypeKey: string;
  objectId: string;
  isEditMode: boolean;
  viewerUsername?: string | null;
  tagCategoryNames: readonly string[];
  count?: number;
  onViewUpdates?: () => void;
  addLabel: string;
  tagApprovalStats?: TagApprovalStatsIndex;
  onRequireLogin?: () => void;
};

export function ObjectTagsLeftRailSection({
  headingLabel,
  sections,
  objectTypeKey,
  objectId,
  isEditMode,
  viewerUsername,
  tagCategoryNames,
  count,
  onViewUpdates,
  addLabel,
  tagApprovalStats: tagApprovalStatsProp,
  onRequireLogin,
}: ObjectTagsLeftRailSectionProps) {
  useHydrateWalletProvider();
  const { t } = useI18n();
  const router = useRouter();
  const odlCustomJsonId = useOdlCustomJsonId();

  const [tagApprovalStats, setTagApprovalStats] = useState<
    TagApprovalStatsIndex | undefined
  >(tagApprovalStatsProp);
  const [categoryComposing, setCategoryComposing] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [composingTagCategory, setComposingTagCategory] = useState<string | null>(
    null,
  );
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voteOverrides, setVoteOverrides] = useState<
    Record<string, 'for' | 'against'>
  >({});
  const [optimisticallyLikedTagKeys, setOptimisticallyLikedTagKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());

  useEffect(() => {
    setTagApprovalStats(tagApprovalStatsProp);
  }, [tagApprovalStatsProp]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    if (tagApprovalStatsProp) {
      return;
    }
    let cancelled = false;
    void fetchTagApprovalStatsAction(objectId).then((stats) => {
      if (!cancelled) {
        setTagApprovalStats(stats);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, objectId, tagApprovalStatsProp]);

  const displaySections = useMemo(() => {
    if (!isEditMode) {
      return sections;
    }
    return mergeTagCategorySectionsForEditMode(tagCategoryNames, sections);
  }, [isEditMode, sections, tagCategoryNames]);

  useEffect(() => {
    if (optimisticallyLikedTagKeys.size === 0) {
      return;
    }
    setOptimisticallyLikedTagKeys((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set(prev);
      let changed = false;
      for (const section of displaySections) {
        for (const tag of section.tags) {
          const key = tagOptimisticKey(section.categoryTitle, tag.value);
          if (!next.has(key) || !tag.updateId) {
            continue;
          }
          const stat = resolveTagApprovalStat(tag.updateId, tagApprovalStats);
          if (stat.viewer_vote === 'for') {
            next.delete(key);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [displaySections, optimisticallyLikedTagKeys.size, tagApprovalStats]);

  const refreshTagDataAfterBroadcast = useCallback(async () => {
    await refreshAfterBroadcast(router, () =>
      revalidateObjectAfterBroadcast(objectId),
    );
    const stats = await fetchTagApprovalStatsAction(objectId);
    setTagApprovalStats(stats);
  }, [objectId, router]);

  const broadcastCreate = useCallback(
    async (updateType: string, value: unknown): Promise<boolean> => {
      const definition = UPDATE_REGISTRY[updateType];
      if (!definition) {
        return false;
      }
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin?.();
        return false;
      }
      const parsed = validateUpdateValue(definition, value);
      if (!parsed.success) {
        return false;
      }

      setBusy(true);
      setActionError(null);
      try {
        const createInput = {
          id: odlCustomJsonId,
          objectId,
          updateType,
          creator: voter,
          valueKind: definition.value_kind,
          value: parsed.value,
          required_posting_auths: [voter],
        } as const;
        const op = buildOdlUpdateCreateOp(createInput);
        const result = await broadcastOdlOpWithOverflow({
          op,
          account: voter,
          odlCustomJsonId,
          objectId,
        });
        if (!result.success) {
          setActionError(broadcastOverflowErrorMessage(result.error, t));
          return false;
        }
        void refreshTagDataAfterBroadcast();
        return true;
      } catch {
        setActionError(t('object_edit_validation_error'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [
      objectId,
      odlCustomJsonId,
      onRequireLogin,
      refreshTagDataAfterBroadcast,
      t,
      viewerUsername,
    ],
  );

  const onVote = useCallback(
    async (updateId: string, vote: 'for' | 'against') => {
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin?.();
        return;
      }
      const current =
        voteOverrides[updateId] ??
        resolveTagApprovalStat(updateId, tagApprovalStats).viewer_vote;
      if (current === vote || busy) {
        return;
      }

      setBusy(true);
      try {
        const op = buildOdlUpdateVoteOp({
          id: odlCustomJsonId,
          updateId,
          objectId,
          voter,
          vote,
          required_posting_auths: [voter],
        });
        const { transactionId } = await getWalletFacade().broadcast({
          operations: [op],
        });
        setVoteOverrides((prev) => ({ ...prev, [updateId]: vote }));
        void awaitTrxConfirmation(transactionId).finally(() => {
          void refreshTagDataAfterBroadcast();
        });
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      objectId,
      odlCustomJsonId,
      onRequireLogin,
      refreshTagDataAfterBroadcast,
      tagApprovalStats,
      viewerUsername,
      voteOverrides,
    ],
  );

  const submitCategory = useCallback(async () => {
    const name = categoryDraft.trim();
    if (!name) {
      setCategoryComposing(false);
      setCategoryDraft('');
      return;
    }
    await broadcastCreate(UPDATE_TYPES.TAG_CATEGORY, name);
    setCategoryComposing(false);
    setCategoryDraft('');
  }, [broadcastCreate, categoryDraft]);

  const submitTag = useCallback(async () => {
    const category = composingTagCategory;
    const value = tagDraft.trim();
    if (!category || !value) {
      setComposingTagCategory(null);
      setTagDraft('');
      return;
    }
    const ok = await broadcastCreate(UPDATE_TYPES.TAG_CATEGORY_ITEM, { category, value });
    if (ok) {
      setOptimisticallyLikedTagKeys((prev) => {
        const next = new Set(prev);
        next.add(tagOptimisticKey(category, value));
        return next;
      });
    }
    setComposingTagCategory(null);
    setTagDraft('');
  }, [broadcastCreate, composingTagCategory, tagDraft]);

  if (!isEditMode) {
    return (
      <div className="space-y-4">
        {displaySections.map((section) => (
          <div key={section.categoryTitle}>
            <p className="text-fg text-body-sm font-weight-body">
              {section.categoryTitle}:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {section.tags.map((tag) => (
                <Link
                  key={`${section.categoryTitle}-${tag.value}`}
                  href={buildDiscoverHref({
                    type: objectTypeKey,
                    tags: [encodeTagFilter(section.categoryTitle, tag.value)],
                  })}
                  prefetch={false}
                  className="rounded-btn bg-surface px-2 py-1 text-caption text-fg transition-colors hover:bg-ghost-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  aria-label={t('object_tag_discover_aria')
                    .replace('{category}', section.categoryTitle)
                    .replace('{tag}', tag.value)}
                  suppressHydrationWarning
                >
                  {tag.value}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {actionError ? (
        <p className="mb-2 text-body-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        {categoryComposing ? (
          <span className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-pill border border-dashed border-border-strong px-2.5 py-1">
            <input
              type="text"
              autoFocus
              value={categoryDraft}
              disabled={busy}
              placeholder={t('object_tags_add_category_placeholder')}
              className="min-w-0 flex-1 bg-transparent text-body-sm text-fg outline-none placeholder:text-muted"
              onChange={(event) => setCategoryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitCategory();
                }
                if (event.key === 'Escape') {
                  setCategoryComposing(false);
                  setCategoryDraft('');
                }
              }}
              onBlur={() => {
                if (categoryDraft.trim().length > 0) {
                  void submitCategory();
                } else {
                  setCategoryComposing(false);
                }
              }}
            />
            <button
              type="button"
              className="text-caption text-muted hover:text-accent"
              aria-label={t('object_tags_reject_aria')}
              onClick={() => {
                setCategoryComposing(false);
                setCategoryDraft('');
              }}
            >
              ×
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setCategoryComposing(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill border border-accent bg-accent/10 text-accent hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label={t('object_tags_add_category')}
            title={t('object_tags_add_category')}
          >
            <PlusIcon size="sm" className="block shrink-0" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-weight-label text-fg">{headingLabel}</p>
          {count != null ? (
            <div className="mt-1">
              <LeftRailUpdateCountBadge
                count={count}
                onClick={onViewUpdates}
                fieldLabel={headingLabel}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {displaySections.map((section) => (
          <div key={section.categoryTitle}>
            <p className="text-fg text-body-sm font-weight-body">
              {section.categoryTitle}:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {section.tags.map((tag) => {
                const updateId = tag.updateId;
                const optimisticKey = tagOptimisticKey(section.categoryTitle, tag.value);
                const optimisticLiked = optimisticallyLikedTagKeys.has(optimisticKey);
                const stat = resolveTagApprovalStat(updateId, tagApprovalStats);
                const viewerVote =
                  updateId && voteOverrides[updateId] !== undefined
                    ? voteOverrides[updateId]
                    : optimisticLiked
                      ? 'for'
                      : stat.viewer_vote;
                const voteDisabled = busy || !updateId;
                return (
                  <TagChip
                    key={`${section.categoryTitle}-${tag.value}-${updateId ?? 'no-id'}`}
                    label={tag.value}
                    viewerVote={viewerVote}
                    disabled={voteDisabled}
                    onApprove={
                      updateId
                        ? () => void onVote(updateId, 'for')
                        : undefined
                    }
                    onReject={
                      updateId
                        ? () => void onVote(updateId, 'against')
                        : undefined
                    }
                    approveAria={t('object_tags_approve_aria').replace(
                      '{tag}',
                      tag.value,
                    )}
                    rejectAria={t('object_tags_reject_aria')}
                  />
                );
              })}
              {composingTagCategory === section.categoryTitle ? (
                <TagChip
                  label=""
                  empty
                  editing
                  editValue={tagDraft}
                  disabled={busy}
                  composePlaceholder={t('object_tags_new_tag_placeholder')}
                  onEditValueChange={setTagDraft}
                  onEditSubmit={() => void submitTag()}
                  onEditCancel={() => {
                    setComposingTagCategory(null);
                    setTagDraft('');
                  }}
                  rejectAria={t('object_tags_reject_aria')}
                />
              ) : (
                <TagChip
                  label={t('object_tags_new_tag')}
                  empty
                  disabled={busy}
                  onClick={() => {
                    setComposingTagCategory(section.categoryTitle);
                    setTagDraft('');
                  }}
                />
              )}
            </div>
          </div>
        ))}

        {displaySections.length === 0 && !categoryComposing ? (
          <p className="text-caption text-muted">{addLabel}</p>
        ) : null}
      </div>
    </>
  );
}
