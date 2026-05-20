import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import {
  getUserProfileQuery,
  UserProfileHeroClient,
  UserProfileSocialCountsProvider,
} from '@/modules/user-profile';
import { getUserFollowingObjectsPageQuery } from '@/modules/user-social';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export default async function ProfileGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const auth = createCookieAuthContextProvider();
  const viewerUser = await auth.getUser();
  const viewer = viewerUser?.username ?? null;
  const locale = await getRequestLocale();

  const [profile, objectsHead] = await Promise.all([
    getUserProfileQuery(decoded, viewer),
    getUserFollowingObjectsPageQuery(
      decoded,
      { sort: 'weight', skip: 0, limit: 0 },
      locale,
      viewer,
    ),
  ]);
  if (!profile) {
    notFound();
  }

  return (
    <UserProfileSocialCountsProvider
      value={{
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        followingObjectsCount: objectsHead.total,
      }}
    >
      <Suspense fallback={null}>
        <UserProfileHeroClient
          accountName={decoded}
          initialUser={profile}
          viewerUsername={viewer}
        />
        {children}
      </Suspense>
    </UserProfileSocialCountsProvider>
  );
}
