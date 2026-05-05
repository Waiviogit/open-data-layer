'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserAvatar } from '@/shared/presentation';

import type { UserFollowListView } from '@/modules/user-social/application/dto/user-social.dto';

export type UserSocialAccountRowProps = {
  row: UserFollowListView;
  /** Current logged-in Hive account; when absent, follow control is disabled. */
  viewerUsername: string | null;
};

export function UserSocialAccountRow({ row, viewerUsername }: UserSocialAccountRowProps) {
  const { t } = useI18n();
  const href = `/@${row.name}`;
  const isSelf = viewerUsername != null && viewerUsername === row.name;
  const showFollowControl = !isSelf;

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
          disabled={viewerUsername == null}
          title={viewerUsername == null ? t('social_follow_login_hint') : undefined}
          className={[
            'shrink-0 rounded-btn border px-3 py-1.5 text-body-sm font-medium transition-colors',
            row.isCurrentFollowing
              ? 'border-border bg-surface-control text-muted'
              : 'border-accent text-accent hover:bg-accent/10',
            viewerUsername == null ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          {row.isCurrentFollowing ? t('following') : t('follow')}
        </button>
      ) : null}
    </li>
  );
}
