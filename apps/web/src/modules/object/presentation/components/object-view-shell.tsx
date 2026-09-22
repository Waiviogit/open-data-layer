import type { ReactNode } from 'react';

import type { ObjectMobileCenterLayout } from '../../domain/object-mobile-layout';
import {
  FixedRegion,
  StickyRegion,
} from '@/shared/presentation/layout';

export type ObjectViewShellProps = {
  hero: ReactNode;
  /** Left rail (mounted twice for CSS shell-mode swap — same structure as profile `(main)/layout`). */
  leftRail: ReactNode;
  center: ReactNode;
  rightRail: ReactNode;
  /** Mobile stacking mode below `lg`; desktop layout is unchanged. */
  mobileLayout?: ObjectMobileCenterLayout;
  /** Reviews preview for standard-object mobile Details landing. */
  mobileSocialSlot?: ReactNode;
};

function MobileLeftRailCopy({ leftRail }: { leftRail: ReactNode }) {
  return (
    <div className="shell-hide-instagram lg:hidden" data-testid="object-mobile-left-rail">
      {leftRail}
    </div>
  );
}

/**
 * Profile-parity shell: `shell-profile-grid`, Instagram rail hide, Twitter sticky vs fixed rail swap.
 * @see docs/apps/web/spec/layout-system.md
 * @see docs/apps/web/spec/shell-mode.md
 */
export function ObjectViewShell({
  hero,
  leftRail,
  center,
  rightRail,
  mobileLayout = 'centerOnly',
  mobileSocialSlot,
}: ObjectViewShellProps) {
  const hideCenterOnMobile =
    mobileLayout === 'standardView' || mobileLayout === 'standardEdit';
  const showMobileDetailsBeforeCenter =
    mobileLayout === 'standardView' || mobileLayout === 'standardEdit';
  const showMobileSocial =
    mobileLayout === 'standardView' && mobileSocialSlot != null;
  const showMobileDetailsAfterCenter = mobileLayout === 'specialEdit';
  const hideRightRailOnMobile = mobileLayout !== 'standardView';

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {hero}
      <div
        className={[
          'shell-profile-grid shell-object-page-grid mt-card-padding grid grid-cols-1 gap-card-padding',
          'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
        ].join(' ')}
      >
        <div className="hidden lg:block">
          <div className="shell-profile-left-rail shell-hide-instagram">
            <div className="shell-hide-twitter">
              <StickyRegion offset="0">{leftRail}</StickyRegion>
            </div>
            <div className="shell-show-twitter">
              <FixedRegion>{leftRail}</FixedRegion>
            </div>
          </div>
        </div>

        <main className="flex min-h-[12rem] min-w-0 flex-col gap-card-padding">
          {showMobileDetailsBeforeCenter ? (
            <MobileLeftRailCopy leftRail={leftRail} />
          ) : null}

          {showMobileSocial ? (
            <div className="lg:hidden" data-testid="object-mobile-social">
              {mobileSocialSlot}
            </div>
          ) : null}

          <div
            className={hideCenterOnMobile ? 'hidden lg:block' : undefined}
            data-testid="object-center-column"
          >
            {center}
          </div>

          {showMobileDetailsAfterCenter ? (
            <MobileLeftRailCopy leftRail={leftRail} />
          ) : null}
        </main>

        <div
          className={hideRightRailOnMobile ? 'hidden min-w-0 lg:block' : 'min-w-0'}
          data-testid="object-right-rail-column"
        >
          <div className="shell-hide-instagram lg:contents">{rightRail}</div>
        </div>
      </div>
    </div>
  );
}
