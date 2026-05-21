'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';

import { buildOdlRankVoteOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

/** ODL rank units per half-star (5 stars = 10000). */
export const RANK_UNITS_PER_HALF_STAR = 1000;
const HALF_SLOTS = 10;

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

export type StarRatingProps = {
  averageRating01To5: number | null;
  userRating01To5: number | null;
  totalVoters: number;
  dimension: string;
  updateId: string;
  objectId: string;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  /** When true, no hover/click (e.g. feed cards). */
  readOnly?: boolean;
  size?: 'sm' | 'md';
  showNumeric?: boolean;
};

type HalfFill = 'empty' | 'average' | 'user' | 'hover';

function halfSlotsFromStars(stars01To5: number | null): number {
  if (stars01To5 == null || !Number.isFinite(stars01To5)) {
    return 0;
  }
  return Math.min(HALF_SLOTS, Math.max(0, Math.round(stars01To5 * 2)));
}

function rankForHalfSlot(slot: number): number {
  return Math.min(10000, Math.max(1000, (slot + 1) * RANK_UNITS_PER_HALF_STAR));
}

function halfFillForSlot(
  slot: number,
  avgSlots: number,
  userSlots: number,
  hoverSlot: number | null,
  interactive: boolean,
): HalfFill {
  if (interactive && hoverSlot !== null && slot <= hoverSlot) {
    return 'hover';
  }
  if (slot < userSlots) {
    return 'user';
  }
  if (slot < avgSlots) {
    return 'average';
  }
  return 'empty';
}

function fillClass(fill: HalfFill): string {
  switch (fill) {
    case 'user':
      return 'text-accent-alt';
    case 'hover':
      return 'text-accent';
    case 'average':
      return 'text-fg-secondary';
    default:
      return 'text-fg-disabled';
  }
}

const STAR_SIZE_PX = { sm: 18, md: 28 } as const;

function halfOpacity(fill: HalfFill): number {
  return fill === 'empty' ? 0.25 : 1;
}

/** One star: both halves share a single SVG so they align without a gap. */
function StarUnit({
  leftFill,
  rightFill,
  sizePx,
  clipId,
  interactive,
  leftSlot,
  rightSlot,
  ariaLabel,
  onHoverSlot,
  onVote,
}: {
  leftFill: HalfFill;
  rightFill: HalfFill;
  sizePx: number;
  clipId: string;
  interactive: boolean;
  leftSlot: number;
  rightSlot: number;
  ariaLabel: string;
  onHoverSlot: (slot: number) => void;
  onVote: (slot: number) => void;
}) {
  const hitClass =
    'absolute top-0 h-full w-1/2 border-0 bg-transparent p-0 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <span
      className="relative inline-block shrink-0 leading-none"
      style={{ width: sizePx, height: sizePx }}
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox="0 0 24 24"
        className="block"
        aria-hidden
      >
        <defs>
          <clipPath id={`${clipId}-left`}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
          <clipPath id={`${clipId}-right`}>
            <rect x="12" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path
          fill="currentColor"
          d={STAR_PATH}
          clipPath={`url(#${clipId}-left)`}
          className={fillClass(leftFill)}
          opacity={halfOpacity(leftFill)}
        />
        <path
          fill="currentColor"
          d={STAR_PATH}
          clipPath={`url(#${clipId}-right)`}
          className={fillClass(rightFill)}
          opacity={halfOpacity(rightFill)}
        />
      </svg>
      {interactive ? (
        <>
          <button
            type="button"
            className={`${hitClass} left-0`}
            aria-label={`${ariaLabel}, ${((leftSlot + 1) * 0.5).toFixed(1)}`}
            onMouseEnter={() => onHoverSlot(leftSlot)}
            onFocus={() => onHoverSlot(leftSlot)}
            onBlur={() => onHoverSlot(-1)}
            onClick={() => onVote(leftSlot)}
          />
          <button
            type="button"
            className={`${hitClass} right-0`}
            aria-label={`${ariaLabel}, ${((rightSlot + 1) * 0.5).toFixed(1)}`}
            onMouseEnter={() => onHoverSlot(rightSlot)}
            onFocus={() => onHoverSlot(rightSlot)}
            onBlur={() => onHoverSlot(-1)}
            onClick={() => onVote(rightSlot)}
          />
        </>
      ) : null}
    </span>
  );
}

export function StarRating({
  averageRating01To5,
  userRating01To5,
  totalVoters,
  dimension,
  updateId,
  objectId,
  viewerUsername,
  onRequireLogin,
  readOnly = false,
  size = 'md',
  showNumeric = true,
}: StarRatingProps) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const baseId = useId();
  const sizePx = STAR_SIZE_PX[size];

  const [optimisticUserStars, setOptimisticUserStars] = useState(userRating01To5);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticUserStars(userRating01To5);
    setError(null);
    setConfirming(false);
  }, [userRating01To5, updateId]);

  const interactive =
    !readOnly &&
    updateId.length > 0 &&
    objectId.length > 0 &&
    !pending &&
    !confirming;

  const avgSlots = halfSlotsFromStars(averageRating01To5);
  const userSlots = halfSlotsFromStars(optimisticUserStars);

  const displayStars =
    hoverSlot !== null
      ? (hoverSlot + 1) * 0.5
      : optimisticUserStars ?? averageRating01To5;

  const onVote = useCallback(
    async (slot: number) => {
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin?.();
        return;
      }
      const rank = rankForHalfSlot(slot);
      const stars = (slot + 1) * 0.5;
      if (optimisticUserStars != null && Math.round(optimisticUserStars * 2) === slot + 1) {
        return;
      }
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
        setOptimisticUserStars(stars);
        setHoverSlot(null);
        setPending(false);
        setConfirming(true);
        void awaitTrxConfirmation(transactionId).finally(() => {
          void refreshAfterBroadcast(router, () =>
            revalidateObjectAfterBroadcast(objectId),
          ).finally(() => {
            setConfirming(false);
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vote failed');
        setPending(false);
      }
    },
    [
      objectId,
      odlCustomJsonId,
      onRequireLogin,
      optimisticUserStars,
      router,
      updateId,
      viewerUsername,
    ],
  );

  const ariaLabel =
    dimension.length > 0
      ? `${dimension}: ${displayStars != null ? displayStars.toFixed(1) : '—'}`
      : displayStars != null
        ? displayStars.toFixed(1)
        : 'Rating';

  return (
    <div className="min-w-0">
      <div
        className={`inline-flex items-center gap-1 ${interactive ? '' : 'pointer-events-none'}`}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoverSlot(null)}
      >
        {Array.from({ length: 5 }, (_, starIndex) => {
          const leftSlot = starIndex * 2;
          const rightSlot = leftSlot + 1;
          const clipId = `${baseId}-s${starIndex}`;

          return (
            <StarUnit
              key={starIndex}
              sizePx={sizePx}
              clipId={clipId}
              interactive={interactive}
              leftSlot={leftSlot}
              rightSlot={rightSlot}
              ariaLabel={ariaLabel}
              leftFill={halfFillForSlot(
                leftSlot,
                avgSlots,
                userSlots,
                hoverSlot,
                interactive,
              )}
              rightFill={halfFillForSlot(
                rightSlot,
                avgSlots,
                userSlots,
                hoverSlot,
                interactive,
              )}
              onHoverSlot={(slot) => setHoverSlot(slot >= 0 ? slot : null)}
              onVote={(slot) => void onVote(slot)}
            />
          );
        })}
      </div>
      {showNumeric ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted">
          {displayStars != null ? (
            <span className="tabular-nums text-fg-secondary">{displayStars.toFixed(1)}</span>
          ) : null}
          <span className="tabular-nums">({totalVoters})</span>
        </div>
      ) : null}
      {error ? (
        <p className="mt-1 text-caption text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
