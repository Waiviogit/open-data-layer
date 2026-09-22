'use client';

import Link from 'next/link';

import { useIpfsContentBaseUrl } from '@/config/ipfs-content-base-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserAvatar } from '@/shared/presentation';

import { resolveChannelImageUrl } from '../domain/messaging.helpers';
import type { ChannelDetail } from '../domain/messaging.types';
import {
  MESSAGING_COLUMN_FOOTER_INNER_CLASS,
  MESSAGING_COLUMN_FOOTER_SHELL_CLASS,
} from './messaging-layout.constants';

export type MessagingChannelAboutProps = {
  channel: ChannelDetail;
  description?: string | null;
  /** `rail` — profile third column; `embedded` — inside messenger shell. */
  variant?: 'rail' | 'embedded';
  onEdit?: () => void;
  onLeave?: () => void;
};

export function MessagingChannelAbout({
  channel,
  description = null,
  variant = 'embedded',
  onEdit,
  onLeave,
}: MessagingChannelAboutProps) {
  const { t } = useI18n();
  const contentBaseUrl = useIpfsContentBaseUrl();
  const title = channel.display_title ?? channel.title ?? channel.channel_id;
  const imageUrl = resolveChannelImageUrl(channel.image, contentBaseUrl);
  const peerAvatarUrl =
    channel.peer == null
      ? null
      : (channel.members.find((member) => member.account === channel.peer)?.avatar_url ?? null);
  const isGroupAdmin = channel.kind === 'group' && channel.viewer_role === 'admin';
  const canLeave = channel.kind === 'group' && channel.leave_policy.can_leave;
  const showMemberRoster = channel.kind !== 'object';

  return (
    <aside
      className={[
        'flex h-full min-h-0 flex-col overflow-hidden bg-bg px-4 pt-4',
        variant === 'embedded' ? 'border-l border-border' : '',
        !(canLeave && onLeave) ? 'pb-4' : '',
      ].join(' ')}
    >
      <div className="flex flex-col items-center text-center">
        <h2 className="w-full text-center text-body-lg font-weight-strong text-fg">
          {t('messaging_about')}
        </h2>
        <div className="mx-auto flex w-full flex-col items-center text-center">
          {channel.kind === 'direct' && channel.peer ? (
            <div className="mx-auto">
              <UserAvatar
                username={channel.peer}
                avatarUrl={peerAvatarUrl}
                displayName={channel.peer}
                size={72}
              />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="mx-auto size-[4.5rem] rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex size-[4.5rem] items-center justify-center rounded-full bg-surface-control text-heading-sm font-weight-strong text-fg-secondary">
              {title.trim().charAt(0).toUpperCase() || '#'}
            </div>
          )}
          <p className="mt-3 font-weight-strong text-fg">{title}</p>
          {description ? (
            <p className="mt-2 text-body-sm text-muted">{description}</p>
          ) : null}
          {showMemberRoster ? (
            <p className="mt-1 text-caption text-muted">
              {t('messaging_members_count').replace('{count}', String(channel.members.length))}
            </p>
          ) : null}
          {isGroupAdmin && onEdit ? (
            <button
              type="button"
              className="mt-2 text-body-sm text-accent hover:underline"
              onClick={onEdit}
            >
              {t('messaging_edit_group')}
            </button>
          ) : null}
        </div>
      </div>
      {showMemberRoster ? (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <h3 className="text-body-sm font-weight-label text-fg">{t('messaging_members')}</h3>
          <ul className="mt-2 space-y-2">
            {channel.members.slice(0, 8).map((member) => (
              <li key={member.account}>
                <Link
                  href={`/@${member.account}`}
                  className="flex items-center gap-2 rounded-btn px-1 py-1 hover:bg-surface-control/60"
                >
                  <UserAvatar
                    username={member.account}
                    avatarUrl={member.avatar_url ?? null}
                    displayName={member.account}
                    size={32}
                  />
                  <span className="truncate text-body-sm text-fg">{member.account}</span>
                </Link>
              </li>
            ))}
          </ul>
          {channel.members.length > 8 ? (
            <p className="mt-2 text-caption text-muted">
              {t('messaging_members_more').replace(
                '{count}',
                String(channel.members.length - 8),
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}
      {canLeave && onLeave ? (
        <div className={[MESSAGING_COLUMN_FOOTER_SHELL_CLASS, 'mt-auto'].join(' ')}>
          <div className={MESSAGING_COLUMN_FOOTER_INNER_CLASS}>
            <button
              type="button"
              className="w-full text-body-sm text-error hover:underline"
              onClick={onLeave}
            >
              {t('messaging_leave_group')}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
