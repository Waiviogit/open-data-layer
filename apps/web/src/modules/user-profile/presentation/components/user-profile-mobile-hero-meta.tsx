'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { CircleStarIcon } from '@/icons';
import { getHiveReputationRankKey } from '../../domain/get-hive-reputation-rank';
import type { UserAccountSidebarView } from '../../domain/types/user-account-sidebar-view';
import { formatSidebarUsd } from '../utils/account-sidebar-format';

export type UserProfileMobileHeroMetaProps = {
  sidebar: UserAccountSidebarView;
  isLoading?: boolean;
  onCover?: boolean;
};

export function UserProfileMobileHeroMeta({
  sidebar,
  isLoading = false,
  onCover = false,
}: UserProfileMobileHeroMetaProps) {
  const { t, locale } = useI18n();
  const rankKey = getHiveReputationRankKey(sidebar.hive.reputation);

  if (isLoading) {
    return (
      <div className="lg:hidden flex w-full max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <div className="h-6 w-24 animate-pulse rounded-btn bg-surface" />
        <div className="h-6 w-36 animate-pulse rounded-btn bg-surface" />
      </div>
    );
  }

  return (
    <div
      className={[
        'lg:hidden flex w-full max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-2 text-body-sm',
        onCover ? 'hero-on-photo-muted' : 'text-muted',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-1.5 rounded-btn bg-surface px-2 py-0.5 text-fg">
        <CircleStarIcon size={14} className="shrink-0" />
        <span className="font-weight-label">{t(rankKey)}</span>
      </span>
      <span>
        {t('vote_value')}:{' '}
        <span className={onCover ? 'tabular-nums hero-on-photo-title' : 'tabular-nums text-fg'}>
          {formatSidebarUsd(sidebar.totalVoteValueUsd, locale)}
        </span>
      </span>
    </div>
  );
}
