import { notFound } from 'next/navigation';

import { getUserProfileQuery } from '@/modules/user-profile';

const ACCOUNT_NAME_RE = /^[a-zA-Z0-9.-]{3,32}$/;

/**
 * Validates `[name]` for all routes under `/user-profile/[name]/…` (profile shell and articles).
 * Profile hero lives only under `(profile)/layout.tsx`.
 */
export default async function UserProfileNameLayout({
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
  return <>{children}</>;
}
