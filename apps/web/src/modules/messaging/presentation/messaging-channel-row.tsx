'use client';

import { useIpfsContentBaseUrl } from '@/config/ipfs-content-base-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserAvatar } from '@/shared/presentation';

import { resolveChannelImageUrl } from '../domain/messaging.helpers';
import type { ChannelListItem } from '../domain/messaging.types';
import { LockIcon } from '@/icons';

export type MessagingChannelRowProps = {
  channel: ChannelListItem;
  active: boolean;
  onSelect: (channelId: string) => void;
};

function GroupChannelAvatar({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="size-11 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = title.trim().charAt(0).toUpperCase() || '#';
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-control text-body-sm font-weight-strong text-fg-secondary"
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function MessagingChannelRow({
  channel,
  active,
  onSelect,
}: MessagingChannelRowProps) {
  const { t } = useI18n();
  const contentBaseUrl = useIpfsContentBaseUrl();
  const title = channel.display_title ?? channel.list_title ?? channel.channel_id;
  const preview = channel.last_message_preview ?? '';
  const encryptedPreview = channel.last_message_encrypted === true;

  return (
    <button
      type="button"
      onClick={() => onSelect(channel.channel_id)}
      className={[
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-accent-soft' : 'hover:bg-surface-control/60',
      ].join(' ')}
    >
      {channel.kind === 'direct' && channel.peer ? (
        <UserAvatar
          username={channel.peer}
          avatarUrl={channel.peer_avatar_url ?? null}
          displayName={channel.peer}
          size={44}
        />
      ) : (
        <GroupChannelAvatar
          title={title}
          imageUrl={resolveChannelImageUrl(channel.image, contentBaseUrl)}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-weight-label text-fg">{title}</span>
          {channel.unread_count > 0 ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-weight-strong text-accent-fg">
              {channel.unread_count > 9 ? '9+' : channel.unread_count}
            </span>
          ) : null}
        </div>
        {preview ? (
          <p className="mt-0.5 truncate text-body-sm text-muted">{preview}</p>
        ) : encryptedPreview ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-body-sm text-muted">
            <LockIcon className="size-3.5 shrink-0" />
            {t('messaging_message_encrypted')}
          </p>
        ) : null}
      </div>
    </button>
  );
}
