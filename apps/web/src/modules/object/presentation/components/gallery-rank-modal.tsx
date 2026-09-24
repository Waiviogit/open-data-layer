'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react';

import { buildOdlRankVoteOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import {
  clampGalleryRank,
  defaultGalleryRankSeed,
  formatGalleryRankLabel,
  GALLERY_RANK_MAX,
  GALLERY_RANK_MIN,
  GALLERY_RANK_STEP,
} from '@/modules/object/domain/gallery-rank';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import {
  AppModal,
  AppModalCloseButton,
  MODAL_Z_INDEX_GALLERY,
  ObjectThumbnail,
} from '@/shared/presentation';

import { GalleryMediaItem, isGalleryVideoUrl } from './gallery-media-item';

export type GalleryRankModalProps = {
  open: boolean;
  onClose: () => void;
  updateId: string;
  objectId: string;
  rankScore: number | null;
  viewerRank: number | null;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  imagePreviewUrl?: string | null;
  /** Called after successful broadcast with submitted rank (before trx confirm). */
  onRankSubmitted?: (rank: number) => void;
  /** Called when trx confirmation + refresh cycle finishes. */
  onConfirmFinished?: () => void;
};

export function GalleryRankModal({
  open,
  onClose,
  updateId,
  objectId,
  rankScore,
  viewerRank,
  viewerUsername,
  onRequireLogin,
  imagePreviewUrl,
  onRankSubmitted,
  onConfirmFinished,
}: GalleryRankModalProps) {
  useHydrateWalletProvider();
  const { t } = useI18n();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const titleId = useId();
  const sliderId = useId();

  const [localRank, setLocalRank] = useState(() => defaultGalleryRankSeed(viewerRank));
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLocalRank(defaultGalleryRankSeed(viewerRank));
    setError(null);
    setPending(false);
    setConfirming(false);
  }, [open, updateId, viewerRank]);

  const onConfirm = useCallback(async () => {
    const voter = viewerUsername?.trim();
    if (!voter) {
      onRequireLogin?.();
      return;
    }
    if (pending || confirming) {
      return;
    }
    const rank = clampGalleryRank(localRank);
    setError(null);
    setPending(true);
    try {
      const op = buildOdlRankVoteOp({
        id: odlCustomJsonId,
        updateId,
        objectId,
        voter,
        rank,
        required_posting_auths: [voter],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      setPending(false);
      setConfirming(true);
      onRankSubmitted?.(rank);
      onClose();
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(objectId, { updateId }),
        ).finally(() => {
          setConfirming(false);
          onConfirmFinished?.();
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('object_edit_validation_error'));
      setPending(false);
    }
  }, [
    confirming,
    localRank,
    objectId,
    odlCustomJsonId,
    onClose,
    onConfirmFinished,
    onRankSubmitted,
    onRequireLogin,
    pending,
    router,
    t,
    updateId,
    viewerUsername,
  ]);

  const currentRankLabel = t('gallery_rank_current').replace(
    '{value}',
    formatGalleryRankLabel(rankScore),
  );

  const sliderFillPercent = useMemo(() => {
    const span = GALLERY_RANK_MAX - GALLERY_RANK_MIN;
    if (span <= 0) {
      return 0;
    }
    return ((localRank - GALLERY_RANK_MIN) / span) * 100;
  }, [localRank]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      zIndex={MODAL_Z_INDEX_GALLERY + 10}
      panelClassName="w-full max-w-md"
    >
      <div className="p-card-padding">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-section font-weight-strong text-fg">
            {t('gallery_rank_label')}
          </h2>
          <AppModalCloseButton onClose={onClose} />
        </div>

        {imagePreviewUrl ? (
          isGalleryVideoUrl(imagePreviewUrl) ? (
            <div className="relative mb-4 aspect-video w-full overflow-hidden border border-border bg-surface-alt">
              <GalleryMediaItem src={imagePreviewUrl} sizes="20rem" previewOnly />
            </div>
          ) : (
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-btn border border-border bg-surface-alt">
              <ObjectThumbnail
                src={imagePreviewUrl}
                fill
                avatarSize="large"
                className="object-contain"
                sizes="20rem"
              />
            </div>
          )
        ) : null}

        <p className="mb-4 text-body-sm text-fg-secondary">{currentRankLabel}</p>

        <label htmlFor={sliderId} className="mb-2 block text-body-sm font-weight-label text-fg">
          {t('gallery_rank_your_rank')}
        </label>
        <div className="mb-2 flex items-center gap-3">
          <input
            id={sliderId}
            type="range"
            min={GALLERY_RANK_MIN}
            max={GALLERY_RANK_MAX}
            step={GALLERY_RANK_STEP}
            value={localRank}
            disabled={pending || confirming}
            className="gallery-rank-slider min-w-0 flex-1"
            style={{ '--slider-fill': `${sliderFillPercent}%` } as CSSProperties}
            onChange={(e) => setLocalRank(clampGalleryRank(Number(e.target.value)))}
          />
          <span className="w-14 shrink-0 text-right text-body-sm tabular-nums text-fg-secondary">
            {formatGalleryRankLabel(localRank)}
          </span>
        </div>

        {error ? (
          <p className="mb-3 text-caption text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-btn border border-border bg-surface px-4 py-2 text-body-sm font-weight-label text-fg-secondary hover:bg-surface-alt disabled:opacity-50"
            onClick={onClose}
            disabled={pending}
          >
            {t('gallery_rank_cancel')}
          </button>
          <button
            type="button"
            className="rounded-btn bg-accent px-4 py-2 text-body-sm font-weight-label text-on-accent hover:opacity-90 disabled:opacity-50"
            onClick={() => void onConfirm()}
            disabled={pending || confirming}
          >
            {pending || confirming ? t('gallery_rank_confirming') : t('gallery_rank_confirm')}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
