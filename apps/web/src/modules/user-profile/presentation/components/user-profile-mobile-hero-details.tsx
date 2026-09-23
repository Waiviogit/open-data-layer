'use client';

import { ExternalLinkButton } from '@/modules/object/presentation/components/external-link-modal';
import { useI18n } from '@/i18n/providers/i18n-provider';

import type { UserAccountSidebarView } from '../../domain/types/user-account-sidebar-view';
import { formatWebsiteLabel } from '../utils/account-sidebar-format';
import { ProfileAccountSidebarActiveTime } from './profile-account-sidebar-active-time';
import {
  SidebarClockIcon,
  SidebarLinkIcon,
  SidebarLocationIcon,
} from './profile-account-sidebar-icons';

export type UserProfileMobileHeroDetailsProps = {
  bio: string;
  sidebar: UserAccountSidebarView;
  isLoading?: boolean;
  onCover?: boolean;
};

export function UserProfileMobileHeroDetails({
  bio,
  sidebar,
  isLoading = false,
  onCover = false,
}: UserProfileMobileHeroDetailsProps) {
  const { t } = useI18n();
  const website = sidebar.website ? formatWebsiteLabel(sidebar.website) : null;
  const about = bio.trim() || sidebar.about.trim();
  const hasGrid =
    Boolean(sidebar.location) ||
    Boolean(website?.href) ||
    Boolean(sidebar.lastActivityAt);

  if (isLoading) {
    return (
      <div className="lg:hidden mt-2 w-full max-w-md space-y-2">
        <div className="mx-auto h-4 w-64 max-w-full animate-pulse rounded-btn bg-surface" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="h-4 animate-pulse rounded-btn bg-surface" />
          <div className="h-4 animate-pulse rounded-btn bg-surface" />
        </div>
      </div>
    );
  }

  if (!about && !hasGrid) {
    return null;
  }

  return (
    <div className="lg:hidden mt-2 w-full max-w-md text-center">
      {about ? (
        <p
          className={[
            'line-clamp-2 text-body-sm',
            onCover ? 'hero-on-photo-muted' : 'text-muted',
          ].join(' ')}
        >
          {about}
        </p>
      ) : null}
      {hasGrid ? (
        <div
          className={[
            'grid grid-cols-2 gap-x-4 gap-y-1 text-caption',
            onCover ? 'hero-on-photo-muted' : 'text-muted',
            about ? 'mt-3' : '',
          ].join(' ')}
        >
          {sidebar.location ? (
            <div className="flex items-start justify-center gap-1.5 sm:justify-start">
              <SidebarLocationIcon />
              <span className="min-w-0 text-left">{sidebar.location}</span>
            </div>
          ) : (
            <span aria-hidden />
          )}
          {website?.href ? (
            <div className="flex items-start justify-center gap-1.5 sm:justify-start">
              <SidebarLinkIcon />
              <ExternalLinkButton
                href={website.href}
                className="min-w-0 truncate text-left text-accent hover:underline"
              >
                {website.label}
              </ExternalLinkButton>
            </div>
          ) : (
            <span aria-hidden />
          )}
          {sidebar.lastActivityAt ? (
            <div className="col-span-2 flex items-start justify-center gap-1.5">
              <SidebarClockIcon />
              <span>
                {t('active_info')}:{' '}
                <ProfileAccountSidebarActiveTime timestamp={sidebar.lastActivityAt} />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
