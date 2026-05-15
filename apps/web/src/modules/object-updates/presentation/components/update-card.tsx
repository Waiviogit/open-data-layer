'use client';

import Image from 'next/image';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { LocaleId } from '@/i18n/types';
import {
  formatRelativeFeedTime,
  formatReputation,
} from '@/modules/feed/presentation/components/story-utils';
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
};

function unixToIsoSeconds(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

export function UpdateCard({ item, showLocaleBadge }: UpdateCardProps) {
  const { t, locale } = useI18n();
  const loc = locale as LocaleId;
  const relative = formatRelativeFeedTime(unixToIsoSeconds(item.created_at_unix), loc);
  const weightLabel = formatReputation(item.creator_wobjects_weight, loc);
  const approvePercentLabel = item.approve_percent.toLocaleString(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const meetsThreshold = item.approve_percent > OBJECT_UPDATES_MIN_APPROVAL_PERCENT;

  const forActive =
    item.viewer_vote === 'for'
      ? 'text-success bg-success/10 border-success/30'
      : 'text-fg-secondary border-border bg-surface-control';
  const againstActive =
    item.viewer_vote === 'against'
      ? 'text-destructive bg-destructive/10 border-destructive/30'
      : 'text-fg-secondary border-border bg-surface-control';

  const minLine = t('object_updates_min_required').replace(
    '{percent}',
    String(OBJECT_UPDATES_MIN_APPROVAL_PERCENT),
  );

  return (
    <article className="rounded-card border border-border bg-surface/80 p-card-padding">
      <header className="flex flex-wrap items-center gap-2">
        <UserAvatar
          username={item.creator}
          avatarUrl={hiveAvatarUrl(item.creator)}
          size={40}
          displayName={`@${item.creator}`}
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="truncate font-medium text-fg-secondary">@{item.creator}</span>
          {weightLabel ? (
            <span className="rounded bg-surface-control px-1.5 py-0.5 text-caption font-medium text-fg-secondary tabular-nums">
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
          <h3 className="text-body-sm font-semibold text-fg">
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
          className={`text-body-sm font-medium ${meetsThreshold ? 'text-success' : 'text-warning'}`}
        >
          {t('object_updates_approval')} {approvePercentLabel}%
        </p>
        <p className="mt-0.5 text-caption text-muted">{minLine}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className={`rounded-md border px-3 py-1.5 text-caption font-medium ${forActive}`}
          >
            {t('object_updates_approve')} {item.for_vote_count}
          </button>
          <button
            type="button"
            disabled
            className={`rounded-md border px-3 py-1.5 text-caption font-medium ${againstActive}`}
          >
            {t('object_updates_reject')} {item.against_vote_count}
          </button>
        </div>
      </div>
    </article>
  );
}
