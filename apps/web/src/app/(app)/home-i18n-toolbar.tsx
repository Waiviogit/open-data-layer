'use client';

import { useState } from 'react';

import { LocaleSwitcher } from '@/i18n/components/locale-switcher';
import { LoginDialog } from '@/modules/auth';
import { ShellModeSwitcher, ThemeSwitcher } from '@/shared/presentation';

const isDev = process.env.NODE_ENV === 'development';

export function HomeI18nToolbar() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 rounded-btn border border-border bg-surface px-4 py-3 text-fg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LocaleSwitcher />
          {isDev ? (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-btn border border-border bg-secondary px-3 py-1.5 font-label text-body-sm text-secondary-fg hover:bg-tertiary"
            >
              Dev: Sign in
            </button>
          ) : null}
        </div>
        <ShellModeSwitcher />
        <ThemeSwitcher />
      </div>
      {isDev ? (
        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      ) : null}
    </>
  );
}
