'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buildOdlObjectAuthorityOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import type { CardRatingDimension } from '../../application/dto/object-card-rating';
import { mergeRatingDimensions } from '../../application/dto/object-card-rating';
import type { ProjectedObjectView } from '../../application/dto/object-fields';
import { objectFields } from '../../application/dto/object-fields';
import { getRatingDimensionNamesForObjectType } from '@/modules/discover/domain/discover-registry';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';
import { StarRating } from '@/modules/object/presentation/components/star-rating';
import { objectPagePath } from '@/shared/routes/object-page-path';

const THUMB_SIZE = 120;

function formatLinkedObjectTypeLabel(type: string | null): string {
  if (type == null || type.trim() === '') {
    return '';
  }
  return type
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function RatingsGrid({
  dims,
  objectId,
  viewerUsername,
  onRequireLogin,
}: {
  dims: CardRatingDimension[];
  objectId: string;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
}) {
  if (dims.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
      {dims.map(
        ({ dimension, update_id, averageRating01To5, userRating01To5, totalVoters }) => (
          <div key={dimension} className="flex min-w-0 items-center gap-1.5">
            <StarRating
              averageRating01To5={averageRating01To5}
              userRating01To5={userRating01To5}
              totalVoters={totalVoters}
              dimension={dimension}
              updateId={update_id ?? ''}
              valueText={update_id ? undefined : dimension}
              objectId={objectId}
              viewerUsername={viewerUsername}
              onRequireLogin={onRequireLogin}
              size="sm"
              showNumeric={false}
            />
            <span className="truncate text-caption text-fg-secondary">{dimension}</span>
          </div>
        ),
      )}
    </div>
  );
}

function IconHeartAdministrative({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className={active ? 'text-accent' : 'text-fg-tertiary'}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function AdministrativeHeartButton({
  objectId,
  initialActive,
  viewerUsername,
  onRequireLogin,
}: {
  objectId: string;
  initialActive: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
}) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { t } = useI18n();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive, objectId]);

  const onToggle = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      onRequireLogin?.();
      return;
    }
    if (pending) {
      return;
    }
    const method = active ? 'remove' : 'add';
    const previous = active;
    setActive(!previous);
    setPending(true);
    try {
      const op = buildOdlObjectAuthorityOp({
        id: odlCustomJsonId,
        objectId,
        authorityType: 'administrative',
        method,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(objectId),
        ).finally(() => {
          setPending(false);
        });
      });
    } catch {
      setActive(previous);
      setPending(false);
    }
  }, [active, objectId, odlCustomJsonId, onRequireLogin, pending, router, viewerUsername]);

  const hint = active ? t('feed_linked_object_admin_hint') : t('object_detail_favorites_add');
  const canInteract = viewerUsername != null && viewerUsername.trim().length > 0;

  if (!canInteract) {
    return (
      <span
        className="inline-flex"
        title={initialActive ? t('feed_linked_object_admin_hint') : undefined}
        aria-label={initialActive ? t('feed_linked_object_admin_hint') : undefined}
      >
        <IconHeartAdministrative active={initialActive} />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex rounded-sm p-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      aria-pressed={active}
      title={hint}
      aria-label={hint}
      onClick={() => void onToggle()}
    >
      <IconHeartAdministrative active={active} />
    </button>
  );
}

export type ObjectCardProps = {
  object: ProjectedObjectView;
  /** When navigating from an intercepted-route modal (`@modal`), replaces the post URL so the modal slot resets. */
  linkReplace?: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

/**
 * Shop / feed card: rectangular thumbnail, title, type · categories, rating, excerpt, admin heart.
 */
export function ObjectCard({
  object: o,
  linkReplace = false,
  viewerUsername,
  onRequireLogin,
}: ObjectCardProps) {
  const typeLabel = formatLinkedObjectTypeLabel(o.object_type);
  const categoryLabels = objectFields.tagCategoryLabels(o);
  const subtitleParts = [typeLabel, ...categoryLabels.filter(Boolean)].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');
  const thumbUrl = objectFields.image(o);
  const name = objectFields.name(o);
  const description = objectFields.description(o);
  const href = objectPagePath(o.object_id);
  const titleLabel = name ?? o.object_id;
  const objectTypeKey = o.object_type?.trim() ?? '';
  const ratingDims = mergeRatingDimensions(
    getRatingDimensionNamesForObjectType(objectTypeKey),
    objectFields.aggregateRatingAspects(o),
  );

  return (
    <li className="relative list-none rounded-card border border-border bg-surface-control/40 p-card-padding shadow-whisper">
      <div className="absolute end-3 top-3">
        <AdministrativeHeartButton
          objectId={o.object_id}
          initialActive={o.hasAdministrativeAuthority ?? false}
          viewerUsername={viewerUsername}
          onRequireLogin={onRequireLogin}
        />
      </div>
      <div className="flex gap-3 pe-8">
        <div className="shrink-0">
          <Link
            href={href}
            replace={linkReplace}
            prefetch={false}
            className="inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label={`View object: ${titleLabel}`}
          >
            <span
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface ring-1 ring-border/60"
              style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
            >
              {thumbUrl ? (
                <Image
                  src={thumbUrl}
                  alt=""
                  className="size-full object-cover"
                  width={THUMB_SIZE}
                  height={THUMB_SIZE}
                  sizes={`${THUMB_SIZE}px`}
                  unoptimized={shouldUnoptimizeRemoteImage(thumbUrl)}
                />
              ) : (
                <Image
                  src={AVATAR_PLACEHOLDER_SRC}
                  alt=""
                  className="size-full object-cover"
                  width={THUMB_SIZE}
                  height={THUMB_SIZE}
                  sizes={`${THUMB_SIZE}px`}
                />
              )}
            </span>
          </Link>
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            replace={linkReplace}
            prefetch={false}
            className="inline-block max-w-full rounded-sm font-weight-label text-body text-heading underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {titleLabel}
          </Link>
          {subtitle ? <p className="mt-0.5 text-caption text-fg-secondary">{subtitle}</p> : null}
          <RatingsGrid
            dims={ratingDims}
            objectId={o.object_id}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
          />
          {description ? (
            <p className="mt-2 text-body-sm leading-body text-muted line-clamp-4">{description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
