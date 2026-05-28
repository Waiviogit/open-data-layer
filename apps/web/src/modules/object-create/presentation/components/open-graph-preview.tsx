'use client';

import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  OG_PREVIEW_IMAGE_ASPECT_RATIO,
  previewSiteHostname,
  truncateOgDescription,
  truncateOgTitle,
} from '../../domain/open-graph-preview';

export type OpenGraphPreviewProps = {
  displayTitle: string;
  description: string;
  imageUrl: string | null;
  untitledLabel: string;
  noImageLabel: string;
  noDescriptionLabel: string;
};

type OgVariant = 'desktop' | 'mobile';

function OgCard({
  variant,
  hostname,
  displayTitle,
  description,
  descriptionFallback,
  imageUrl,
  noImageLabel,
  untitledLabel,
}: {
  variant: OgVariant;
  hostname: string;
  displayTitle: string;
  description: string;
  descriptionFallback: string;
  imageUrl: string | null;
  noImageLabel: string;
  untitledLabel: string;
}) {
  const title = useMemo(
    () => truncateOgTitle(displayTitle || untitledLabel),
    [displayTitle, untitledLabel],
  );
  const desc = useMemo(() => {
    const raw = description.trim() || descriptionFallback;
    return truncateOgDescription(raw);
  }, [description, descriptionFallback]);

  const isMobile = variant === 'mobile';

  return (
    <article
      className={[
        'overflow-hidden bg-[#f2f3f5] text-[#1c1e21]',
        isMobile ? 'rounded-lg' : 'rounded-md',
      ].join(' ')}
      aria-label={variant === 'desktop' ? 'Desktop link preview' : 'Mobile link preview'}
    >
      <div
        className={[
          'border-b border-[#dadde1] bg-white px-3',
          isMobile ? 'py-1.5' : 'py-2',
        ].join(' ')}
      >
        <p
          className={[
            'truncate font-sans uppercase tracking-wide text-[#65676b]',
            isMobile ? 'text-[10px]' : 'text-[11px]',
          ].join(' ')}
        >
          {hostname}
        </p>
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full object-cover"
          style={{ aspectRatio: String(OG_PREVIEW_IMAGE_ASPECT_RATIO) }}
        />
      ) : (
        <div
          className="flex w-full items-center justify-center bg-[#e4e6eb] font-sans text-[#65676b]"
          style={{ aspectRatio: String(OG_PREVIEW_IMAGE_ASPECT_RATIO) }}
        >
          <span className={isMobile ? 'text-[11px]' : 'text-xs'}>{noImageLabel}</span>
        </div>
      )}

      <div
        className={[
          'border-t border-[#dadde1] bg-white font-sans',
          isMobile ? 'px-2.5 py-2' : 'px-3 py-2.5',
        ].join(' ')}
      >
        <p
          className={[
            'font-semibold leading-snug text-[#050505]',
            isMobile ? 'line-clamp-2 text-[13px]' : 'line-clamp-1 text-sm',
          ].join(' ')}
          title={displayTitle || untitledLabel}
        >
          {title.text || untitledLabel}
        </p>
        <p
          className={[
            'mt-0.5 leading-snug text-[#65676b]',
            isMobile ? 'line-clamp-2 text-[11px]' : 'line-clamp-2 text-xs',
          ].join(' ')}
          title={description.trim() || descriptionFallback}
        >
          {desc.text}
        </p>
      </div>
    </article>
  );
}

export function OpenGraphPreview({
  displayTitle,
  description,
  imageUrl,
  untitledLabel,
  noImageLabel,
  noDescriptionLabel,
}: OpenGraphPreviewProps) {
  const { t } = useI18n();
  const [hostname, setHostname] = useState('opden.io');
  const [variant, setVariant] = useState<OgVariant>('desktop');

  useEffect(() => {
    setHostname(previewSiteHostname());
  }, []);

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-btn border border-border bg-ghost-surface p-0.5"
        role="tablist"
        aria-label={t('object_create_og_preview_mode')}
      >
        {(['desktop', 'mobile'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={variant === id}
            onClick={() => setVariant(id)}
            className={[
              'rounded-btn px-3 py-1 text-caption font-medium',
              variant === id
                ? 'bg-surface text-fg shadow-sm'
                : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {id === 'desktop'
              ? t('object_create_og_desktop')
              : t('object_create_og_mobile')}
          </button>
        ))}
      </div>

      {variant === 'desktop' ? (
        <div className="mx-auto w-full max-w-[524px]">
          <OgCard
            variant="desktop"
            hostname={hostname}
            displayTitle={displayTitle}
            description={description}
            descriptionFallback={noDescriptionLabel}
            imageUrl={imageUrl}
            noImageLabel={noImageLabel}
            untitledLabel={untitledLabel}
          />
          <p className="mt-2 text-center font-mono text-[10px] text-muted">
            1200×630 · 1.91:1
          </p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[280px]">
          <div className="rounded-[1.75rem] border-[3px] border-border bg-ghost-surface p-2 shadow-md">
            <div className="mb-1 flex justify-center gap-1 pt-0.5">
              <span className="size-1 rounded-full bg-border" aria-hidden />
              <span className="h-1 w-8 rounded-full bg-border" aria-hidden />
            </div>
            <OgCard
              variant="mobile"
              hostname={hostname}
              displayTitle={displayTitle}
              description={description}
              descriptionFallback={noDescriptionLabel}
              imageUrl={imageUrl}
              noImageLabel={noImageLabel}
              untitledLabel={untitledLabel}
            />
          </div>
          <p className="mt-2 text-center text-caption text-muted">
            {t('object_create_og_mobile_hint')}
          </p>
        </div>
      )}
    </div>
  );
}
