'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

function IconPlaySmall({ className }: { className?: string }) {
  return (
    <span
      className={className}
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="drop-shadow-sm"
      >
        <path d="M8 5v14l11-7L8 5z" />
      </svg>
    </span>
  );
}

export type StoryPreviewTileProps = {
  story: FeedStoryView;
};

function tileLabel(story: FeedStoryView): string {
  if (story.title && story.title.trim().length > 0) {
    return story.title.trim();
  }
  return `Post by @${story.authorName}`;
}

/**
 * Square image-only preview for dense profile grids (e.g. Instagram shell mode).
 */
export function StoryPreviewTile({ story }: StoryPreviewTileProps) {
  const previewMediaUrl = story.videoThumbnailUrl ?? story.thumbnailUrl;
  const showVideoBadge = Boolean(story.videoEmbedUrl ?? story.videoThumbnailUrl);
  const label = tileLabel(story);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewMediaUrl]);

  const inner = (
    <div className="relative aspect-square w-full overflow-hidden bg-surface-control">
      {previewMediaUrl && !previewFailed ? (
        <Image
          src={previewMediaUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover"
          unoptimized={shouldUnoptimizeRemoteImage(previewMediaUrl)}
          onError={() => setPreviewFailed(true)}
        />
      ) : previewMediaUrl && previewFailed ? (
        <div
          className="flex h-full w-full items-center justify-center px-2 text-center text-caption text-muted"
          role="status"
        >
          <span className="line-clamp-3">{label}</span>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-surface-control text-caption text-muted"
          aria-hidden
        >
          <span className="max-w-[90%] truncate px-2 text-center">{label}</span>
        </div>
      )}
      {showVideoBadge ? (
        <div className="absolute right-1.5 top-1.5 text-white drop-shadow-md">
          <IconPlaySmall className="inline-flex rounded-circle bg-overlay/80 p-1" />
        </div>
      ) : null}
    </div>
  );

  if (story.permalinkPath) {
    return (
      <Link
        href={story.permalinkPath}
        className="block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label={label}
      >
        {inner}
      </Link>
    );
  }

  return (
    <article className="min-w-0" aria-label={label}>
      {inner}
    </article>
  );
}
