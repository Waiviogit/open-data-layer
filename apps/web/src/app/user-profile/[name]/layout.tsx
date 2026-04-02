import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { UserProfileShell } from '@/modules/user-profile';

import { getMockUserProfile } from './mock-user-profile';

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
  const profile = getMockUserProfile(decoded);
  return (
    <Suspense fallback={null}>
      <UserProfileShell accountName={decoded} initialUser={profile}>
        {children}
      </UserProfileShell>
    </Suspense>
  );
}
