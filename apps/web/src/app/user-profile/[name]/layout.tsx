import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getUserProfileQuery, UserProfileShell } from '@/modules/user-profile';
import { HomeI18nToolbar } from '@/app/home-i18n-toolbar';

const ACCOUNT_NAME_RE = /^[a-zA-Z0-9.-]{3,32}$/;

export default async function UserProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (!ACCOUNT_NAME_RE.test(decoded)) {
    notFound();
  }
  const profile = await getUserProfileQuery(decoded);
  if (!profile) {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <HomeI18nToolbar />
      <UserProfileShell accountName={decoded} initialUser={profile}>
        {children}
      </UserProfileShell>
    </Suspense>
  );
}
