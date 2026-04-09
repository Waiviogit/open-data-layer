'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LocaleSwitcher } from '@/i18n/components/locale-switcher';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { LoginDialog } from '@/modules/auth';

import type { AppHeaderUser } from '../../domain/app-header-user';

export type HeaderActionsProps = {
  user: AppHeaderUser | null;
};

export function HeaderActions({ user }: HeaderActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  async function onLogout() {
    setLogoutPending(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      router.refresh();
    } finally {
      setLogoutPending(false);
    }
  }

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

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={`/@${encodeURIComponent(user.username)}`}
        className="rounded-btn px-2 py-1.5 font-label text-body-sm text-link hover:underline"
      >
        {t('my_profile')}
      </Link>
      <button
        type="button"
        onClick={() => void onLogout()}
        disabled={logoutPending}
        className="rounded-btn border border-border bg-secondary px-3 py-1.5 font-label text-body-sm text-secondary-fg hover:bg-tertiary disabled:opacity-50"
      >
        {logoutPending ? '…' : t('logout')}
      </button>
    </div>
  );
}
