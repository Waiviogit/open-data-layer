'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { PlayIcon } from '@/icons';
import { getImagePathPost } from '@/shared/infrastructure/image/get-proxy-image-url';
import {
  buildVideoEmbedUrl,
  parseVideoUrl,
  type ParsedVideoPreview,
} from '@/shared/infrastructure/video-preview';

import { useVideoPreviewThumbnail } from '../hooks/use-video-preview-thumbnail';

export type VideoPreviewPlayerProps = {
  /** Raw video URL or pre-parsed preview metadata. */
  source: string | ParsedVideoPreview;
  /** Optional static poster (e.g. feed `videoThumbnailUrl`). */
  staticThumbnailUrl?: string | null;
  /** Iframe title when playing. */
  title?: string;
  /** `feed` — inline in story cards; `tile` — badge only; `gallery` — grid/carousel; `viewer` — fullscreen modal. */
  variant?: 'feed' | 'tile' | 'gallery' | 'viewer';
  /** Controlled play state (viewer). When omitted, player manages its own state. */
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** When true, poster/play only — no inline iframe (grid tiles). */
  previewOnly?: boolean;
  className?: string;
  onPlayClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

function variantClasses(variant: VideoPreviewPlayerProps['variant']): {
  wrapper: string;
  playingWrapper: string;
  posterImg: string;
  minHeight: string;
} {
  switch (variant) {
    case 'tile':
      return {
        wrapper: 'relative aspect-square w-full overflow-hidden bg-surface-control',
        playingWrapper: 'relative aspect-square w-full overflow-hidden bg-black',
        posterImg: 'absolute inset-0 size-full object-cover',
        minHeight: 'min-h-0',
      };
    case 'gallery':
      return {
        wrapper: 'relative size-full overflow-hidden bg-surface-control',
        playingWrapper: 'relative aspect-video size-full overflow-hidden bg-black',
        posterImg: 'absolute inset-0 size-full object-cover',
        minHeight: 'min-h-0',
      };
    case 'viewer':
      return {
        wrapper: 'relative size-full overflow-hidden bg-black',
        playingWrapper: 'relative aspect-video size-full overflow-hidden bg-black',
        posterImg: 'absolute inset-0 size-full object-contain',
        minHeight: 'min-h-0',
      };
    case 'feed':
    default:
      return {
        wrapper: 'rounded-btn border border-border bg-surface-control',
        playingWrapper:
          'relative aspect-video w-full overflow-hidden rounded-btn border border-border bg-black',
        posterImg: 'block h-auto w-full',
        minHeight: 'min-h-[180px]',
      };
  }
}

export function VideoPreviewPlayer({
  source,
  staticThumbnailUrl = null,
  title,
  variant = 'feed',
  playing: controlledPlaying,
  onPlayingChange,
  previewOnly = false,
  className = '',
  onPlayClick,
}: VideoPreviewPlayerProps) {
  const { t } = useI18n();
  const preview = typeof source === 'string' ? parseVideoUrl(source) : source;
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const playing = controlledPlaying ?? internalPlaying;
  const setPlaying = useCallback(
    (next: boolean) => {
      if (onPlayingChange) {
        onPlayingChange(next);
      } else {
        setInternalPlaying(next);
      }
    },
    [onPlayingChange],
  );

  const embedUrl = preview?.embedUrl ?? null;
  const previewMediaUrl = useVideoPreviewThumbnail(embedUrl, staticThumbnailUrl ?? preview?.thumbnailUrl);
  const previewMediaDisplayUrl = previewMediaUrl ? getImagePathPost(previewMediaUrl) : null;
  const canPlay = Boolean(embedUrl) && !previewOnly && variant !== 'viewer';
  const showHostEmbed = variant === 'viewer' && !previewOnly && Boolean(embedUrl);
  const showInlineVideo = canPlay && playing;

  useEffect(() => {
    setPosterFailed(false);
  }, [previewMediaUrl, source]);

  useEffect(() => {
    if (controlledPlaying === false) {
      setInternalPlaying(false);
    }
  }, [controlledPlaying, source]);

  if (!preview) {
    return null;
  }

  const classes = variantClasses(variant);
  const iframeTitle = title?.trim() ? `${title.trim()} — video` : 'Video';

  const previewPlayGlyph = previewOnly ? (
    <span
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      aria-hidden
    >
      <span className="inline-flex items-center justify-center rounded-circle bg-overlay/80 p-3 shadow-card">
        <PlayIcon
          size={variant === 'viewer' ? 32 : 28}
          className="ml-0.5 text-accent-fg"
        />
      </span>
    </span>
  ) : null;

  if (variant === 'tile') {
    return (
      <div className={[classes.wrapper, className].filter(Boolean).join(' ')}>
        {previewMediaDisplayUrl && !posterFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewMediaDisplayUrl}
            alt=""
            className={classes.posterImg}
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface-control" aria-hidden />
        )}
        <div className="absolute right-1.5 top-1.5 text-accent-fg">
          <span
            className="inline-flex rounded-circle bg-overlay/80 p-1"
            aria-hidden
          >
            <PlayIcon
              size={20}
              className="drop-shadow-[0_1px_2px_var(--color-overlay)]"
            />
          </span>
        </div>
      </div>
    );
  }

  const wrapperClass = showInlineVideo || showHostEmbed
    ? [classes.playingWrapper, className].filter(Boolean).join(' ')
    : [classes.wrapper, className].filter(Boolean).join(' ');

  const handlePlay = (event: MouseEvent<HTMLButtonElement>) => {
    onPlayClick?.(event);
    if (!event.defaultPrevented && canPlay) {
      setPlaying(true);
    }
  };

  return (
    <div className={wrapperClass}>
      {showHostEmbed && embedUrl ? (
        <iframe
          title={iframeTitle}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0 bg-black"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : showInlineVideo && embedUrl ? (
        <>
          <iframe
            title={iframeTitle}
            src={buildVideoEmbedUrl(preview, { autoplay: true })}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          <button
            type="button"
            className="absolute right-2 top-2 z-30 rounded-btn bg-overlay/90 px-2 py-1 text-caption font-weight-label text-fg shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onClick={() => setPlaying(false)}
          >
            {t('close_video')}
          </button>
        </>
      ) : posterFailed ? (
        <div
          className={`relative flex ${classes.minHeight} w-full items-center justify-center text-caption text-muted`}
          role="status"
        >
          {t('video_preview_unavailable')}
          {previewPlayGlyph}
        </div>
      ) : previewMediaDisplayUrl ? (
        <div className={variant === 'feed' ? 'relative w-full' : 'relative size-full'}>
          {/* External video posters — plain img avoids Next/Image aspect-ratio crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewMediaDisplayUrl}
            alt=""
            className={classes.posterImg}
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(true)}
          />
          {previewPlayGlyph}
          {canPlay ? (
            <button
              type="button"
              className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              onClick={handlePlay}
              aria-label={t('play_video')}
            >
              <span
                className="inline-flex items-center justify-center rounded-circle bg-overlay/80 p-3 shadow-card"
                aria-hidden
              >
                <PlayIcon
                  size={28}
                  className="ml-0.5 text-accent-fg"
                />
              </span>
            </button>
          ) : null}
        </div>
      ) : previewOnly ? (
        <div
          className={`relative flex ${classes.minHeight} w-full items-center justify-center`}
        >
          {previewPlayGlyph}
        </div>
      ) : canPlay ? (
        <div
          className={`relative flex ${classes.minHeight} w-full items-center justify-center`}
        >
          <button
            type="button"
            className="pointer-events-auto flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onClick={handlePlay}
            aria-label={t('play_video')}
          >
            <span
              className="inline-flex items-center justify-center rounded-circle bg-overlay/80 p-3 shadow-card"
              aria-hidden
            >
              <PlayIcon
                size={28}
                className="ml-0.5 text-accent-fg"
              />
            </span>
          </button>
        </div>
      ) : (
        <div
          className={`flex ${classes.minHeight} w-full items-center justify-center text-caption text-muted`}
          role="status"
        >
          {t('video_preview_unavailable')}
        </div>
      )}
    </div>
  );
}

export { parseVideoUrl, type ParsedVideoPreview };
