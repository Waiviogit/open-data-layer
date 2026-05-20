'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useLoginModal } from '@/modules/auth/presentation';
import { UserAvatar } from '@/shared/presentation';

import type { UserFollowListView } from '@/modules/user-social/application/dto/user-social.dto';
import { broadcastUserFollowToggle } from '@/modules/user-social/infrastructure/broadcast-user-subscription';

export type UserSocialAccountRowProps = {
  row: UserFollowListView;
  /** Current logged-in Hive account; when absent, follow control is disabled. */
  viewerUsername: string | null;
};

export function UserSocialAccountRow({ row, viewerUsername }: UserSocialAccountRowProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const href = `/@${row.name}`;
  const isSelf = viewerUsername != null && viewerUsername === row.name;
  const showFollowControl = !isSelf;
  const [isCurrentFollowing, setIsCurrentFollowing] = useState(row.isCurrentFollowing);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setIsCurrentFollowing(row.isCurrentFollowing);
  }, [row.isCurrentFollowing]);

  const onFollowClick = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (pending) {
      return;
    }
    const previous = isCurrentFollowing;
    setIsCurrentFollowing(!previous);
    setPending(true);
    try {
      await broadcastUserFollowToggle(account, row.name, previous);
      router.refresh();
    } catch {
      setIsCurrentFollowing(previous);
    } finally {
      setPending(false);
    }
  }, [isCurrentFollowing, openLogin, pending, row.name, router, viewerUsername]);

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <Link href={href} className="shrink-0">
        <UserAvatar username={row.name} avatarUrl={row.avatarUrl} displayName={row.name} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="font-medium text-fg hover:underline">
          {row.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-fg-secondary">
          <span className="rounded-md border border-border bg-surface-control px-2 py-0.5 font-mono text-body-sm text-fg">
            {row.wobjectsWeight.toFixed(2)}
          </span>
          <span aria-hidden>·</span>
          <span>{row.usersFollowingCount}</span>
        </p>
      </div>
      {showFollowControl ? (
        <button
          type="button"
          disabled={viewerUsername == null || pending}
          title={viewerUsername == null ? t('social_follow_login_hint') : undefined}
          onClick={() => void onFollowClick()}
          className={[
            'group shrink-0 rounded-btn border px-3 py-1.5 text-body-sm font-medium transition-colors disabled:opacity-50',
            isCurrentFollowing
              ? 'border-border bg-surface-control text-muted hover:border-red-400 hover:bg-red-500/10 hover:text-red-600'
              : 'border-accent text-accent hover:bg-accent/10',
            viewerUsername == null ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          <span className={isCurrentFollowing ? 'group-hover:hidden' : ''}>
            {isCurrentFollowing ? t('following') : t('follow')}
          </span>
          {isCurrentFollowing ? (
            <span className="hidden group-hover:inline">{t('unfollow')}</span>
          ) : null}
        </button>
      ) : null}
    </li>
  );
}
