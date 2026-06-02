'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import type {
  SemanticCompleteness,
  SemanticDimension,
  SemanticDimensionId,
  SemanticDimensionRating,
} from '../../domain/object-create.types';

export type ObjectHealthPanelProps = {
  completeness: SemanticCompleteness;
};

const DIMENSION_I18N: Record<SemanticDimensionId, string> = {
  identity: 'object_create_dim_identity',
  media: 'object_create_dim_media',
  seo: 'object_create_dim_seo',
  relations: 'object_create_dim_relations',
  discoverability: 'object_create_dim_discoverability',
  aiReadability: 'object_create_dim_ai_readability',
};

const RATING_I18N: Record<SemanticDimensionRating, string> = {
  excellent: 'object_create_rating_excellent',
  good: 'object_create_rating_good',
  medium: 'object_create_rating_medium',
  weak: 'object_create_rating_weak',
  missing: 'object_create_rating_missing',
};

const RATING_BADGE_CLASS: Record<SemanticDimensionRating, string> = {
  excellent: 'border-accent/40 bg-accent/15 text-accent',
  good: 'border-accent/25 bg-accent/10 text-fg',
  medium: 'border-border bg-ghost-surface text-fg-secondary',
  weak: 'border-border bg-bg text-muted',
  missing: 'border-border-subtle bg-bg text-muted',
};

function hintLabel(hint: string, t: (key: string) => string): string {
  if (hint === 'description_length') {
    return t('object_create_completeness_hint_description_length');
  }
  if (hint === 'name_slug') {
    return t('object_create_completeness_hint_name_slug');
  }
  if (hint === 'objectType') {
    return t('object_create_select_type_hint');
  }
  return labelForUpdateType(hint);
}

function DimensionRow({
  dim,
  t,
}: {
  dim: SemanticDimension;
  t: (key: string) => string;
}) {
  const visibleHints = dim.hints.filter((h) => h !== 'not_applicable');

  return (
    <li className="group rounded-btn px-1 py-1.5 hover:bg-ghost-surface/80">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-fg">{t(DIMENSION_I18N[dim.id])}</span>
        <span
          className={[
            'shrink-0 rounded-full border px-2.5 py-0.5 text-caption font-weight-label capitalize',
            RATING_BADGE_CLASS[dim.rating],
          ].join(' ')}
        >
          {t(RATING_I18N[dim.rating])}
        </span>
      </div>
      {visibleHints.length > 0 &&
      (dim.rating === 'missing' ||
        dim.rating === 'weak' ||
        dim.rating === 'medium') ? (
        <p className="mt-0.5 line-clamp-2 text-caption text-muted">
          {visibleHints.map((h) => hintLabel(h, t)).join(' · ')}
        </p>
      ) : null}
    </li>
  );
}

export function ObjectHealthPanel({ completeness }: ObjectHealthPanelProps) {
  const { t } = useI18n();

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <h2 className="text-section font-display text-heading">
        {t('object_create_completeness_title')}
      </h2>

      <div className="mt-4">
        <div className="flex items-center justify-between text-body-sm">
          <span className="font-weight-label text-fg">{completeness.overallPercent}%</span>
          <span className="text-caption text-muted">
            {t('object_create_completeness_overall')}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={completeness.overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('object_create_completeness_title')}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${completeness.overallPercent}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {completeness.dimensions.map((dim) => (
          <DimensionRow key={dim.id} dim={dim} t={t} />
        ))}
      </ul>
    </section>
  );
}
