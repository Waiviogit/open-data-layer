'use client';

import { LocaleSwitcher } from '../i18n/components/locale-switcher';
import { useI18n } from '../i18n/providers/i18n-provider';

export function HomeI18nToolbar() {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
      <p className="font-medium">{t('search_placeholder')}</p>
      <LocaleSwitcher />
    </div>
  );
}
