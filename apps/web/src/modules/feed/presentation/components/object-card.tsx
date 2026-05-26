'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { CardRatingDimension } from '../../application/dto/object-card-rating';
import { mergeRatingDimensions } from '../../application/dto/object-card-rating';
import type { ProjectedObjectView } from '../../application/dto/object-fields';
import { objectFields } from '../../application/dto/object-fields';
import { getRatingDimensionNamesForObjectType } from '@/modules/discover/domain/discover-registry';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';
import { StarRating } from '@/modules/object/presentation/components/star-rating';
import { AdministrativeHeartButton } from '@/modules/object/presentation/components/administrative-heart-button';
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
