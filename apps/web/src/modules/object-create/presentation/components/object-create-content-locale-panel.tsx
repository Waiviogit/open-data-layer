'use client';

import { locales } from '@/i18n/config/locales';
import { useI18n } from '@/i18n/providers/i18n-provider';

export type ObjectCreateContentLocalePanelProps = {
  language: string;
  submitting?: boolean;
  onLanguageChange: (locale: string) => void;
};

export function ObjectCreateContentLocalePanel({
  language,
  submitting = false,
  onLanguageChange,
}: ObjectCreateContentLocalePanelProps) {
  const { t } = useI18n();

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <label className="flex flex-col gap-2">
        <span className="text-body-sm font-medium text-heading">
          {t('object_create_content_locale')}
        </span>
        <select
          className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={submitting}
          aria-label={t('object_create_content_locale')}
        >
          {locales.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
