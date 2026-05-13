import type { ReactNode } from 'react';

import {
  FixedRegion,
  HiddenBelow,
  StickyRegion,
} from '@/shared/presentation/layout';

export type ObjectViewShellProps = {
  hero: ReactNode;
  /** Left rail (mounted twice for CSS shell-mode swap — same structure as profile `(main)/layout`). */
  leftRail: ReactNode;
  center: ReactNode;
  rightRail: ReactNode;
};

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
}: ObjectViewShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {hero}
      <div
        className={[
          'shell-profile-grid mt-card-padding grid grid-cols-1 gap-card-padding',
          'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
        ].join(' ')}
      >
        <HiddenBelow breakpoint="lg">
          <div className="shell-profile-left-rail shell-hide-instagram">
            <div className="shell-hide-twitter">
              <StickyRegion offset="0">{leftRail}</StickyRegion>
            </div>
            <div className="shell-show-twitter">
              <FixedRegion>{leftRail}</FixedRegion>
            </div>
          </div>
        </HiddenBelow>

        <main className="min-h-[12rem] min-w-0">{center}</main>

        <HiddenBelow breakpoint="lg">
          <div className="shell-hide-instagram">
            <StickyRegion offset="0">{rightRail}</StickyRegion>
          </div>
        </HiddenBelow>
      </div>
    </div>
  );
}
