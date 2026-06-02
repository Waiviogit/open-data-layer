'use client';

import { useEffect, useMemo, useState } from 'react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useIpfsContentBaseUrl } from '@/config/ipfs-content-base-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { objectCanonical } from '@/seo/domain/canonical';

import { extractSeoKeywords } from '../../domain/extract-seo-keywords';
import { labelForObjectType } from '../../domain/object-type-display';
import type { FieldEntry } from '../../domain/object-create.types';
import { previewImageFromFields } from '../../domain/resolve-preview-image-url';
import { OpenGraphPreview } from './open-graph-preview';

const SEO_TITLE_WARN = 60;
const SEO_DESC_WARN = 160;

type PreviewTab = 'preview' | 'seo' | 'og' | 'jsonld';

type PipelineStep = {
  id: PreviewTab | 'objectData';
  labelKey: string;
  tab: PreviewTab;
};

export type ObjectPreviewPanelProps = {
  objectType: string | null;
  objectId: string;
  fields: readonly FieldEntry[];
};

function fieldText(fields: readonly FieldEntry[], type: string): string {
  const entry = fields.find((f) => f.updateType === type);
  if (!entry || typeof entry.value !== 'string') {
    return '';
  }
  return entry.value.trim();
}

function SerpCharCounter({
  current,
  max,
  warningLabel,
}: {
  current: number;
  max: number;
  warningLabel: string;
}) {
  const over = current > max;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-caption">
      <span className={over ? 'font-weight-label text-accent' : 'text-muted'}>
        {current} / {max}
      </span>
      {over ? (
        <span className="text-accent" role="status">
          {warningLabel}
        </span>
      ) : null}
    </div>
  );
}

function canonicalBreadcrumbParts(canonicalUrl: string): string[] {
  try {
    const u = new URL(canonicalUrl);
    const segments = u.pathname.split('/').filter(Boolean);
    return [u.hostname, ...segments];
  } catch {
    return [];
  }
}

export function ObjectPreviewPanel({
  objectType,
  objectId,
  fields,
}: ObjectPreviewPanelProps) {
  const { t } = useI18n();
  const contentBaseUrl = useIpfsContentBaseUrl();
  const [tab, setTab] = useState<PreviewTab>('preview');
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const name = fieldText(fields, UPDATE_TYPES.NAME);
  const title = fieldText(fields, UPDATE_TYPES.TITLE);
  const description = fieldText(fields, UPDATE_TYPES.DESCRIPTION);
  const displayTitle = name || title || objectId;
  const imageUrl = useMemo(
    () => previewImageFromFields(fields, contentBaseUrl),
    [fields, contentBaseUrl],
  );
  const keywords = useMemo(() => extractSeoKeywords(fields), [fields]);

  const canonicalUrl = useMemo(() => {
    if (!origin) {
      return null;
    }
    return objectCanonical(origin, objectId);
  }, [origin, objectId]);

  const titleForSeo = displayTitle || t('object_create_preview_untitled');
  const descriptionForSeo =
    description || t('object_create_preview_no_description');

  const pipelineSteps: PipelineStep[] = [
    {
      id: 'objectData',
      labelKey: 'object_create_pipeline_object_data',
      tab: 'preview',
    },
    { id: 'seo', labelKey: 'object_create_seo_tab', tab: 'seo' },
    { id: 'og', labelKey: 'object_create_og_tab', tab: 'og' },
    { id: 'jsonld', labelKey: 'object_create_jsonld_tab', tab: 'jsonld' },
  ];

  const jsonLd = useMemo(() => {
    const schemaType =
      objectType === 'recipe'
        ? 'Recipe'
        : objectType === 'person'
          ? 'Person'
          : objectType === 'place' ||
              objectType === 'business' ||
              objectType === 'restaurant'
            ? 'Place'
            : objectType === 'product'
              ? 'Product'
              : 'Thing';
    const graph: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      '@id': objectId,
      name: displayTitle,
    };
    if (description) {
      graph['description'] = description;
    }
    if (imageUrl) {
      graph['image'] = imageUrl;
    }
    if (keywords.length > 0) {
      graph['keywords'] = keywords.join(', ');
    }
    for (const f of fields) {
      if (
        f.updateType === UPDATE_TYPES.NAME ||
        f.updateType === UPDATE_TYPES.TITLE ||
        f.updateType === UPDATE_TYPES.DESCRIPTION ||
        f.updateType === UPDATE_TYPES.IMAGE
      ) {
        continue;
      }
      if (typeof f.value === 'string' && f.value.trim()) {
        graph[f.updateType] = f.value.trim();
      }
    }
    return graph;
  }, [objectType, objectId, displayTitle, description, imageUrl, keywords, fields]);

  const breadcrumbParts = canonicalUrl
    ? canonicalBreadcrumbParts(canonicalUrl)
    : [];

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <nav
        className="flex flex-wrap items-center gap-1 border-b border-border pb-3"
        aria-label={t('object_create_pipeline_label')}
      >
        {pipelineSteps.map((step, index) => (
          <span key={step.id} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="px-0.5 text-caption text-muted" aria-hidden>
                ›
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setTab(step.tab)}
              className={[
                'rounded-btn px-2.5 py-1 text-caption font-weight-label',
                tab === step.tab
                  ? 'bg-accent text-accent-fg'
                  : 'text-fg-secondary hover:bg-ghost-surface',
              ].join(' ')}
              aria-current={tab === step.tab ? 'step' : undefined}
            >
              {t(step.labelKey)}
            </button>
          </span>
        ))}
      </nav>

      <div className="mt-4 min-h-[14rem]">
        {tab === 'preview' ? (
          <div className="space-y-3">
            {objectType ? (
              <span className="inline-block rounded-pill bg-ghost-surface px-2 py-0.5 text-caption text-muted">
                {labelForObjectType(objectType)}
              </span>
            ) : null}
            <p className="font-mono text-caption text-muted">
              <span>/object/</span>
              <span className="text-fg">{objectId}</span>
            </p>
            {imageUrl ? (
              <img
                key={imageUrl}
                src={imageUrl}
                alt=""
                className="max-h-48 w-full rounded-btn object-cover"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-btn bg-ghost-surface text-caption text-muted">
                {t('object_create_preview_no_image')}
              </div>
            )}
            <h3 className="text-section font-display text-heading">
              {displayTitle || t('object_create_preview_untitled')}
            </h3>
            {description ? (
              <p className="line-clamp-6 text-body-sm text-fg-secondary">
                {description}
              </p>
            ) : (
              <p className="text-body-sm italic text-muted">
                {t('object_create_preview_no_description')}
              </p>
            )}
          </div>
        ) : null}

        {tab === 'seo' ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-btn border border-border bg-bg p-4">
              <SerpCharCounter
                current={titleForSeo.length}
                max={SEO_TITLE_WARN}
                warningLabel={t('object_create_seo_title_too_long')}
              />
              <p className="line-clamp-1 text-body-sm text-accent">
                {titleForSeo}
              </p>

              {canonicalUrl ? (
                <p className="truncate font-mono text-caption text-fg-secondary">
                  {breadcrumbParts.map((part, i) => (
                    <span key={`${part}-${i}`}>
                      {i > 0 ? (
                        <span className="text-muted"> › </span>
                      ) : null}
                      <span className={i === 0 ? 'text-fg-secondary' : ''}>
                        {part}
                      </span>
                    </span>
                  ))}
                </p>
              ) : (
                <p className="font-mono text-caption text-muted">…</p>
              )}
              <p
                className="truncate text-caption text-muted"
                title={canonicalUrl ?? undefined}
              >
                {canonicalUrl ?? '—'}
              </p>

              <SerpCharCounter
                current={descriptionForSeo.length}
                max={SEO_DESC_WARN}
                warningLabel={t('object_create_seo_desc_truncated')}
              />
              <p className="line-clamp-2 text-body-sm text-fg-secondary">
                {descriptionForSeo}
              </p>
            </div>

            <div className="rounded-btn border border-border-subtle bg-ghost-surface p-3">
              <p className="text-body-sm font-weight-label text-heading">
                {t('object_create_seo_keywords_title')}
              </p>
              {keywords.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <li
                      key={kw}
                      className="rounded-pill border border-border bg-bg px-2.5 py-0.5 font-mono text-caption text-fg"
                    >
                      {kw}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-caption text-muted">
                  {t('object_create_seo_keywords_empty')}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'og' ? (
          <OpenGraphPreview
            displayTitle={displayTitle}
            description={description}
            imageUrl={imageUrl}
            untitledLabel={t('object_create_preview_untitled')}
            noImageLabel={t('object_create_preview_no_image')}
            noDescriptionLabel={t('object_create_preview_no_description')}
          />
        ) : null}

        {tab === 'jsonld' ? (
          <pre className="max-h-80 overflow-auto rounded-btn bg-bg p-3 font-mono text-caption text-fg">
            {JSON.stringify(jsonLd, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
