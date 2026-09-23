import type { ReactNode } from 'react';
import { Suspense } from 'react';

import {
  FixedRegion,
  FeedColumn,
} from '@/shared/presentation/layout';
import {
  ProfileMainWalletModalShell,
  RightSidebar,
  UserMenuVerticalRail,
  UserProfileMainContentPendingShell,
  UserProfileSubmenu,
} from '@/modules/user-profile';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

/**
 * Profile `(main)` shell — parity with {@link ObjectViewShell}.
 * @see apps/web/src/modules/object/presentation/components/object-view-shell.tsx
 */
export default async function UserProfileMainShellLayout({
  children,
  leftSidebar,
  params,
}: {
  children: ReactNode;
  leftSidebar: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();

  return (
    <ProfileMainWalletModalShell>
    <div
      className={[
        'shell-profile-grid mt-card-padding grid grid-cols-1 gap-card-padding',
        'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
      ].join(' ')}
    >
      <div className="hidden min-w-0 lg:block">
        <div className="shell-profile-left-rail shell-hide-instagram lg:contents">
          <div className="shell-hide-twitter lg:contents">{leftSidebar}</div>
          <div className="shell-show-twitter">
            <FixedRegion>
              <UserMenuVerticalRail accountName={accountName} />
            </FixedRegion>
          </div>
        </div>
      </div>

      <main className="min-h-[12rem] min-w-0">
        <FeedColumn>
          <Suspense fallback={null}>
            <UserProfileSubmenu accountName={accountName} />
          </Suspense>
          <UserProfileMainContentPendingShell>
            {children}
          </UserProfileMainContentPendingShell>
        </FeedColumn>
      </main>

      <div className="hidden min-w-0 lg:block">
        <div className="shell-hide-instagram lg:contents">
          <RightSidebar
            accountName={accountName}
            viewerUsername={user?.username ?? null}
          />
        </div>
      </div>
    </div>
    </ProfileMainWalletModalShell>
  );
}
