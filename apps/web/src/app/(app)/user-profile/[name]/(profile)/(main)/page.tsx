import type { Metadata } from 'next';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { getUserProfileViewQuery } from '@/modules/user-profile';
import {
  buildPersonJsonLd,
  buildProfileMetadata,
  JsonLdScript,
  profileCanonical,
  seoPublicOrigin,
} from '@/seo';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

import { FeedProfileContent } from '../../feed-profile-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const viewer = (await auth.getUser())?.username ?? null;
  const profile = await getUserProfileViewQuery(accountName, viewer, locale);
  if (!profile) {
    return { title: accountName };
  }
  return buildProfileMetadata({
    name: profile.name,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    reputation: profile.reputation,
  });
}

export default async function UserProfileFeedHomePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const viewer = (await auth.getUser())?.username ?? null;
  const profile = await getUserProfileViewQuery(accountName, viewer, locale);
  const origin = seoPublicOrigin();
  const jsonLd =
    profile && origin
      ? buildPersonJsonLd(
          {
            name: profile.name,
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            coverImageUrl: profile.coverImageUrl,
            reputation: profile.reputation,
          },
          profileCanonical(origin, profile.name),
        )
      : null;

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <FeedProfileContent accountName={accountName} feedTab="posts" />
    </>
  );
}
