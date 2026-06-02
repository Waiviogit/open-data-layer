'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buildVoteOp, getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateUserFeedAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import {
  defaultResolveVoteWeight,
  type VoteWeightContext,
} from '../../domain/vote-weight';

import { formatVoteSummary } from './story-utils';

function IconThumbUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconThumbUpFilled({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export type StoryVoteButtonProps = {
  authorName: string;
  permlink: string;
  votes: FeedStoryView['votes'];
  currentUsername: string | null;
  /** Override default full-vs-clear toggle; see `VoteWeightContext` in feed domain. */
  resolveVoteWeight?: (ctx: VoteWeightContext) => number;
};

export function StoryVoteButton({
  authorName,
  permlink,
  votes,
  currentUsername,
  resolveVoteWeight = defaultResolveVoteWeight,
}: StoryVoteButtonProps) {
  useHydrateWalletProvider();
  const router = useRouter();

  const [optimisticVoted, setOptimisticVoted] = useState(votes?.voted ?? false);
  const [optimisticCount, setOptimisticCount] = useState(votes?.totalCount ?? 0);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticVoted(votes?.voted ?? false);
    setOptimisticCount(votes?.totalCount ?? 0);
    setError(null);
    setConfirming(false);
  }, [authorName, permlink, votes?.voted, votes?.totalCount]);

  const previewVoters = votes?.previewVoters ?? [];
  const voteLine = formatVoteSummary(optimisticCount, previewVoters);

  const onVoteClick = useCallback(async () => {
    if (!currentUsername?.trim() || pending) {
      return;
    }
    setError(null);
    setPending(true);
    const weight = resolveVoteWeight({ currentlyVoted: optimisticVoted });
    try {
      const op = buildVoteOp(
        currentUsername.trim(),
        authorName,
        permlink,
        weight,
      );
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      const wasVoted = optimisticVoted;
      setOptimisticVoted(!wasVoted);
      setOptimisticCount((c) => Math.max(0, wasVoted ? c - 1 : c + 1));
      setPending(false);
      setConfirming(true);
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateUserFeedAfterBroadcast(authorName),
        ).finally(() => {
          setConfirming(false);
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
      setPending(false);
    }
  }, [
    authorName,
    currentUsername,
    optimisticVoted,
    pending,
    permlink,
    resolveVoteWeight,
    router,
  ]);

  const iconActive = optimisticVoted;
  const countAccent = optimisticVoted;
  const iconToneClass = iconActive ? 'text-accent' : 'text-muted';
  const countClass =
    countAccent === true
      ? 'font-weight-label tabular-nums text-accent'
      : 'font-weight-label tabular-nums text-fg-secondary';

  const canInteract = Boolean(currentUsername?.trim());

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-btn px-1 py-1 text-caption text-muted transition-colors hover:bg-surface-control hover:text-fg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canInteract || pending}
        aria-label="Likes"
        aria-busy={pending}
        title={voteLine ?? undefined}
        aria-pressed={optimisticVoted}
        onClick={() => void onVoteClick()}
      >
        <span className={iconToneClass}>
          {optimisticVoted ? <IconThumbUpFilled /> : <IconThumbUp />}
        </span>
        {confirming ? (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-circle border-2 border-current border-t-transparent"
            aria-label="Confirming"
          />
        ) : (
          <span className={countClass}>{optimisticCount}</span>
        )}
      </button>
      {error ? (
        <span className="max-w-[12rem] text-nano text-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
