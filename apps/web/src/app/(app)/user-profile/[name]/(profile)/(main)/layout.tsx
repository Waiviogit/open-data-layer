import type { ReactNode } from 'react';

import {
  FixedRegion,
  HiddenBelow,
  StickyRegion,
} from '@/shared/presentation/layout';
import {
  RightSidebar,
  UserMenuVerticalRail,
} from '@/modules/user-profile';

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

  return (
    <div
      className={[
        'shell-profile-grid mt-card-padding grid grid-cols-1 gap-card-padding',
        'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
      ].join(' ')}
    >
      <HiddenBelow breakpoint="lg">
        <div className="shell-profile-left-rail shell-hide-instagram">
          <div className="shell-hide-twitter">
            <StickyRegion offset="0">
              {leftSidebar}
            </StickyRegion>
          </div>
          <div className="shell-show-twitter">
            <FixedRegion>
              <UserMenuVerticalRail accountName={accountName} />
            </FixedRegion>
          </div>
        </div>
      </HiddenBelow>

      <main className="min-h-[12rem] min-w-0">{children}</main>

      <HiddenBelow breakpoint="lg">
        <div className="shell-hide-instagram">
          <StickyRegion offset="0">
            <RightSidebar accountName={accountName} />
          </StickyRegion>
        </div>
      </HiddenBelow>
    </div>
  );
}
