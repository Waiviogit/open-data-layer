import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getUserProfileQuery, UserProfileHeroClient } from '@/modules/user-profile';

export default async function ProfileGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const profile = await getUserProfileQuery(decoded);
  if (!profile) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <UserProfileHeroClient accountName={decoded} initialUser={profile} />
      {children}
    </Suspense>
  );
}
