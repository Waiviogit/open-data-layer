import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getUserProfileQuery, UserProfileHeroClient } from '@/modules/user-profile';

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
      <UserProfileHeroClient accountName={decoded} initialUser={profile} />
      {children}
    </Suspense>
  );
}
