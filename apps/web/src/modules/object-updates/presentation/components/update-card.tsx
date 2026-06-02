'use client';

import Image from 'next/image';
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
import { shouldUnoptimizeRemoteImage, UserAvatar } from '@/shared/presentation';

import type { ObjectUpdateFeedItemView } from '../../application/dto/object-updates-feed.dto';
import { OBJECT_UPDATES_MIN_APPROVAL_PERCENT } from '../../constants';

import { UpdateCardValue } from './update-card-value';

const hiveAvatarUrl = (creator: string): string =>
  `https://images.hive.blog/u/${encodeURIComponent(creator)}/avatar`;

/** When we render image previews, hide redundant `{ url | cid }` JSON for these types. */
const UPDATE_TYPES_HIDE_JSON_WHEN_IMAGE: ReadonlySet<string> = new Set([
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.IMAGE_BACKGROUND,
  UPDATE_TYPES.IMAGE_GALLERY_ITEM,
]);

export type UpdateCardProps = {
  item: ObjectUpdateFeedItemView;
  showLocaleBadge: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

function unixToIsoSeconds(sec: number): string {
  return new Date(sec * 1000).toISOString();
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
  const approvePercentLabel = item.approve_percent.toLocaleString(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const meetsThreshold = item.approve_percent > OBJECT_UPDATES_MIN_APPROVAL_PERCENT;

  const forActive =
    optimisticVote === 'for'
      ? 'text-success bg-success/10 border-success/30'
      : 'text-fg-secondary border-border bg-surface-control hover:bg-surface-control-hover';
  const againstActive =
    optimisticVote === 'against'
      ? 'text-destructive bg-destructive/10 border-destructive/30'
      : 'text-fg-secondary border-border bg-surface-control hover:bg-surface-control-hover';

  const minLine = t('object_updates_min_required').replace(
    '{percent}',
    String(OBJECT_UPDATES_MIN_APPROVAL_PERCENT),
  );

  const creatorProfileHref = `/@${encodeURIComponent(item.creator)}`;

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
            revalidateObjectAfterBroadcast(item.object_id),
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
            className="truncate font-weight-label text-fg-secondary hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            suppressHydrationWarning
          >
            {item.creator}
          </Link>
          {weightLabel ? (
            <span className="rounded bg-surface-control px-1.5 py-0.5 text-caption font-weight-label text-fg-secondary tabular-nums">
              {weightLabel}
            </span>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body-sm font-weight-strong text-fg">
            {labelForUpdateType(item.update_type)}
          </h3>
          {showLocaleBadge ? (
            <span className="rounded-md border border-border bg-surface-alt px-2 py-0.5 text-caption text-fg-secondary">
              {item.locale?.trim() ? item.locale : '—'}
            </span>
          ) : null}
        </div>
      </div>

      {item.image_preview_urls.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {item.image_preview_urls.map((src) => (
            <div
              key={`${item.update_id}:${src}`}
              className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface-alt"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 28rem"
                unoptimized={shouldUnoptimizeRemoteImage(src)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-border pt-3">
        <UpdateCardValue
          value_text={item.value_text}
          value_geo={item.value_geo}
          value_json={
            item.image_preview_urls.length > 0 &&
            UPDATE_TYPES_HIDE_JSON_WHEN_IMAGE.has(item.update_type)
              ? null
              : item.value_json
          }
        />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p
          className={`text-body-sm font-weight-label ${meetsThreshold ? 'text-success' : 'text-warning'}`}
        >
          {t('object_updates_approval')} {approvePercentLabel}%
        </p>
        <p className="mt-0.5 text-caption text-muted">{minLine}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={voteDisabled}
            aria-pressed={optimisticVote === 'for'}
            className={`rounded-md border px-3 py-1.5 text-caption font-weight-label disabled:cursor-not-allowed disabled:opacity-50 ${forActive}`}
            onClick={() => void onVote('for')}
          >
            {t('object_updates_approve')} {item.for_vote_count}
          </button>
          <button
            type="button"
            disabled={voteDisabled}
            aria-pressed={optimisticVote === 'against'}
            className={`rounded-md border px-3 py-1.5 text-caption font-weight-label disabled:cursor-not-allowed disabled:opacity-50 ${againstActive}`}
            onClick={() => void onVote('against')}
          >
            {t('object_updates_reject')} {item.against_vote_count}
          </button>
        </div>
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
