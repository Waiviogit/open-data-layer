'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { ObjectCreateState } from '../../domain/object-create.types';

export type ObjectCreateHeaderProps = {
  state: ObjectCreateState;
  submitting: boolean;
  idExists: boolean | null;
  idCheckPending: boolean;
  onClearAll: () => void;
};

export function ObjectCreateHeader({
  state,
  submitting,
  idExists,
  idCheckPending,
  onClearAll,
}: ObjectCreateHeaderProps) {
  const { t } = useI18n();

  const idStatus =
    idCheckPending ? (
      <span className="text-caption text-muted">{t('object_create_id_checking')}</span>
    ) : idExists === true ? (
      <span className="rounded-pill bg-accent/15 px-2 py-0.5 text-caption font-weight-label text-accent">
        {t('object_create_id_taken')}
      </span>
    ) : idExists === false ? (
      <span className="rounded-pill border border-border bg-ghost-surface px-2 py-0.5 text-caption font-weight-label text-fg">
        {t('object_create_id_available')}
      </span>
    ) : null;

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-section font-display font-weight-strong text-heading">
            {t('object_create_title')}
          </h1>
          <p className="mt-1 max-w-container-content text-body-sm text-fg-secondary">
            {t('object_create_subtitle')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-caption">
              <span className="text-muted">/object/</span>
              <span className="text-fg">{state.objectId}</span>
            </p>
            {idStatus}
          </div>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          disabled={submitting}
          className="shrink-0 rounded-btn border border-border px-4 py-2 text-body-sm font-weight-label text-fg hover:bg-ghost-surface disabled:opacity-50"
        >
          {t('object_create_clear_all')}
        </button>
      </div>
    </header>
  );
}
