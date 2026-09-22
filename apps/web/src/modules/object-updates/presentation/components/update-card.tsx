'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buildOdlUpdateVoteOp } from '@opden-data-layer/hive-broadcast';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import type { LocaleId } from '@/i18n/types';
import {
  formatRelativeFeedTime,
  formatReputation,
} from '@/modules/feed/presentation/components/story-utils';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { ObjectThumbnail, StatHoverTooltip, UserAvatar } from '@/shared/presentation';

import type { ObjectUpdateFeedItemView } from '../../application/dto/object-updates-feed.dto';
import {
  isCollapsedRawJsonUpdate,
  resolveUpdateRawViewValue,
} from '../../application/resolve-update-raw-view-value';
import { OBJECT_UPDATES_MIN_APPROVAL_PERCENT } from '../../constants';

import { UpdateApprovalStatusBlock } from './update-approval-status-block';
import { UpdateCardValue } from './update-card-value';
import { UpdateRawJsonToggle } from './update-raw-json-toggle';
import { UpdateVoteControls } from './update-vote-controls';
import { GalleryRankTriggerButton } from '@/modules/object/presentation/components/gallery-rank-trigger-button';

const hiveAvatarUrl = (creator: string): string =>
  `https://images.hive.blog/u/${encodeURIComponent(creator)}/avatar`;

export type UpdateCardProps = {
  item: ObjectUpdateFeedItemView;
  showLocaleBadge: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

function unixToIsoSeconds(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

function profileHrefForUsername(username: string): string {
  return `/@${encodeURIComponent(username)}`;
}

export function UpdateCard({
  item,
  showLocaleBadge,
  viewerUsername,
  onRequireLogin,
}: UpdateCardProps) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { t, locale } = useI18n();
  const loc = locale as LocaleId;

  const [optimisticVote, setOptimisticVote] = useState(item.viewer_vote);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticVote(item.viewer_vote);
    setError(null);
    setConfirming(false);
  }, [item.update_id, item.viewer_vote]);

  const relative = formatRelativeFeedTime(unixToIsoSeconds(item.created_at_unix), loc);
  const weightLabel = formatReputation(item.creator_wobjects_weight, loc);

  const minLine = t('object_updates_min_required').replace(
    '{percent}',
    String(OBJECT_UPDATES_MIN_APPROVAL_PERCENT),
  );

  const creatorProfileHref = profileHrefForUsername(item.creator);
  const privilegedVote = item.decisive_privileged_vote;
  const rawViewValue = resolveUpdateRawViewValue(item);
  const rawJsonMode = isCollapsedRawJsonUpdate(item.update_type) ? 'toggle' : 'always';

  const voteDisabled = pending || confirming;

  const onVote = useCallback(
    async (vote: 'for' | 'against') => {
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin?.();
        return;
      }
      if (pending || confirming || optimisticVote === vote) {
        return;
      }
      setError(null);
      setPending(true);
      try {
        const op = buildOdlUpdateVoteOp({
          id: odlCustomJsonId,
          updateId: item.update_id,
          objectId: item.object_id,
          voter,
          vote,
          required_posting_auths: [voter],
        });
        const { transactionId } = await getWalletFacade().broadcast({
          operations: [op],
        });
        setOptimisticVote(vote);
        setPending(false);
        setConfirming(true);
        void awaitTrxConfirmation(transactionId).finally(() => {
          void refreshAfterBroadcast(router, () =>
            revalidateObjectAfterBroadcast(item.object_id, {
              updateId: item.update_id,
            }),
          ).finally(() => {
            setConfirming(false);
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('object_edit_validation_error'));
        setPending(false);
      }
    },
    [
      confirming,
      item.object_id,
      item.update_id,
      odlCustomJsonId,
      onRequireLogin,
      optimisticVote,
      pending,
      router,
      t,
      viewerUsername,
    ],
  );

  return (
    <article className="rounded-card border border-border bg-surface/80 p-card-padding">
      <header className="flex flex-wrap items-center gap-2">
        <Link
          href={creatorProfileHref}
          className="inline-flex shrink-0 self-start rounded-circle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`View profile: ${item.creator}`}
          suppressHydrationWarning
        >
          <UserAvatar
            username={item.creator}
            avatarUrl={hiveAvatarUrl(item.creator)}
            size={40}
            displayName={item.creator}
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Link
            href={creatorProfileHref}
            className="truncate font-weight-label text-fg-secondary hover:underline focus-visible:rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            suppressHydrationWarning
          >
            {item.creator}
          </Link>
          {weightLabel ? (
            <StatHoverTooltip content={t('stat_user_expertise_tooltip')}>
              <span className="rounded bg-surface-control px-1.5 py-0.5 text-caption font-weight-label text-fg-secondary tabular-nums">
                {weightLabel}
              </span>
            </StatHoverTooltip>
          ) : null}
          <span className="text-caption text-muted">·</span>
          <time
            className="text-caption text-fg-tertiary"
            dateTime={unixToIsoSeconds(item.created_at_unix)}
          >
            {relative}
          </time>
        </div>
      </header>

      <div className="mt-3 border-t border-border pt-3">
        {rawViewValue != null ? (
          <UpdateRawJsonToggle value={rawViewValue} mode={rawJsonMode}>
            {({ button, panel }) => (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body-sm font-weight-strong text-fg">
                    {labelForUpdateType(item.update_type)}
                  </h3>
                  {button}
                  {showLocaleBadge ? (
                    <span className="ml-auto shrink-0 rounded-btn border border-border bg-surface-alt px-2 py-0.5 text-caption text-fg-secondary">
                      {item.locale?.trim() ? item.locale : '—'}
                    </span>
                  ) : null}
                </div>
                {panel}
              </>
            )}
          </UpdateRawJsonToggle>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body-sm font-weight-strong text-fg">
              {labelForUpdateType(item.update_type)}
            </h3>
            {showLocaleBadge ? (
              <span className="rounded-btn border border-border bg-surface-alt px-2 py-0.5 text-caption text-fg-secondary">
                {item.locale?.trim() ? item.locale : '—'}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {item.image_preview_urls.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {item.image_preview_urls.map((src) => (
            <div
              key={`${item.update_id}:${src}`}
              className="relative aspect-[4/3] w-full max-w-container-narrow overflow-hidden rounded-btn border border-border bg-surface-alt"
            >
              <ObjectThumbnail
                src={src}
                fill
                avatarSize="large"
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 28rem"
              />
            </div>
          ))}
        </div>
      ) : null}

      {item.update_type === UPDATE_TYPES.IMAGE_GALLERY_ITEM ? (
        <div className="mt-3">
          <GalleryRankTriggerButton
            variant="card"
            updateId={item.update_id}
            objectId={item.object_id}
            rankScore={item.rank_score}
            viewerRank={item.viewer_rank}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
            imagePreviewUrl={item.image_preview_urls[0]}
          />
        </div>
      ) : null}

      <div className="mt-3 border-t border-border pt-3">
        <UpdateCardValue value_text={item.value_text} value_geo={item.value_geo} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <UpdateApprovalStatusBlock
          approvePercent={item.approve_percent}
          decisivePrivilegedVote={privilegedVote}
        />
        <p className="mt-2 text-caption text-muted">{minLine}</p>
        <UpdateVoteControls
          objectId={item.object_id}
          updateId={item.update_id}
          approvePercent={item.approve_percent}
          decisivePrivilegedVote={privilegedVote}
          forCount={item.for_vote_count}
          againstCount={item.against_vote_count}
          forPreviewVoters={item.for_preview_voters}
          againstPreviewVoters={item.against_preview_voters}
          optimisticVote={optimisticVote}
          voteDisabled={voteDisabled}
          onVote={(vote) => void onVote(vote)}
        />
        {error ? (
          <p className="mt-2 text-caption text-accent" role="alert">
            {error}
          </p>
        ) : null}
        {confirming ? (
          <p className="mt-2 text-caption text-muted">{t('drafts_loading')}</p>
        ) : null}
      </div>
    </article>
  );
}
