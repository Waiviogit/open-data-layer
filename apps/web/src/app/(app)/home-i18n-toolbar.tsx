'use client';

import { ShellModeSwitcher, ThemeSwitcher } from '@/shared/presentation';
import { LocaleSwitcher } from '@/i18n/components/locale-switcher';

export function HomeI18nToolbar() {
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-btn border border-border bg-surface px-4 py-3 text-fg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleSwitcher />
      </div>
      <ShellModeSwitcher />
      <ThemeSwitcher />
    </div>
  );
}
