'use client';

import { useState } from 'react';

import { LocaleSwitcher } from '@/i18n/components/locale-switcher';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { LoginDialog } from '@/modules/auth';

import type { AppHeaderUser } from '../../domain/app-header-user';
import { LoggedInHeaderActions } from './logged-in-header-actions';

export type HeaderActionsProps = {
  user: AppHeaderUser | null;
};

export function HeaderActions({ user }: HeaderActionsProps) {
  const { t } = useI18n();
  const [loginOpen, setLoginOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="rounded-btn border border-border bg-secondary px-3 py-1.5 font-label text-body-sm text-secondary-fg hover:bg-tertiary"
        >
          {t('signin')}
        </button>
        <div className="max-w-[10rem] sm:max-w-[12rem]">
          <LocaleSwitcher />
        </div>
        <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    );
  }

  return <LoggedInHeaderActions user={user} />;
}
