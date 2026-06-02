'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { objectFields, type ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useLoginModal } from '@/modules/auth/presentation';
import { broadcastObjectUnfollow } from '@/modules/user-social/infrastructure/broadcast-object-unfollow';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateUserSocialAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';
import { objectPagePath } from '@/shared/routes/object-page-path';

const THUMB = 44;

export type UserSocialObjectRowProps = {
  object: SocialProjectedObjectView;
  profileAccountName: string;
  viewerUsername: string | null;
  onRemoved?: (objectId: string) => void;
};

export function UserSocialObjectRow({
  object: o,
  profileAccountName,
  viewerUsername,
  onRemoved,
}: UserSocialObjectRowProps) {
  const { t } = useI18n();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const [pending, setPending] = useState(false);
  const view = o as unknown as ProjectedObjectView;
  const name = objectFields.name(view) ?? o.object_id;
  const img = objectFields.image(view);
  const weight = o.weight ?? null;
  const weightLabel = weight == null ? '—' : weight.toFixed(2);
  const href = objectPagePath(o.object_id);
  const showUnfollow = viewerUsername != null;

  const onUnfollowClick = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await broadcastObjectUnfollow(account, o.object_id, odlCustomJsonId);
      onRemoved?.(o.object_id);
      await refreshAfterBroadcast(router, () =>
        revalidateUserSocialAfterBroadcast(profileAccountName),
      );
    } catch {
      /* revert via refresh on next success */
    } finally {
      setPending(false);
    }
  }, [o.object_id, odlCustomJsonId, onRemoved, openLogin, pending, profileAccountName, router, viewerUsername]);

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="shrink-0">
        <Link
          href={href}
          prefetch={false}
          className="inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label={`View object: ${name}`}
        >
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-border bg-surface ring-1 ring-border/60">
            {img ? (
              <Image
                src={img}
                alt=""
                width={THUMB}
                height={THUMB}
                className="size-full object-cover"
                unoptimized={shouldUnoptimizeRemoteImage(img)}
              />
            ) : (
              <Image
                src={AVATAR_PLACEHOLDER_SRC}
                alt=""
                width={THUMB}
                height={THUMB}
                className="size-full object-cover"
              />
            )}
          </span>
        </Link>
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          prefetch={false}
          className="block truncate font-weight-label text-fg underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {name}
        </Link>
      </div>
      <span className="shrink-0 rounded-md border border-border bg-surface-control px-2 py-0.5 font-mono text-body-sm text-fg-secondary">
        {weightLabel}
      </span>
      {showUnfollow ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void onUnfollowClick()}
          className="shrink-0 rounded-btn border border-border bg-surface-control px-3 py-1.5 text-body-sm font-weight-label text-muted transition-colors hover:border-red-400 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
        >
          {t('unfollow')}
        </button>
      ) : null}
    </li>
  );
}
