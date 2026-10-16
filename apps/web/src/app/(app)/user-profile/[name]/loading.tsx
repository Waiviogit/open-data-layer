import { FeedPostsLoadingSkeleton } from '@/modules/feed';
import { ProfileLeftRailSkeleton } from '@/modules/user-profile';
import { ShellFullBleedBand, ShellInset } from '@/shared/presentation/layout';

/** Prefetch of `/user-profile/:name` stops here — `(profile)/layout` is not rendered. */
export default function UserProfileNameLoading() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <ShellFullBleedBand className="border-b border-border bg-surface">
        <ShellInset className="py-card-padding">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 animate-pulse rounded-circle bg-surface-control" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 max-w-[12rem] animate-pulse rounded-btn bg-surface-control" />
              <div className="h-4 max-w-[8rem] animate-pulse rounded-btn bg-surface-control" />
            </div>
          </div>
        </ShellInset>
      </ShellFullBleedBand>
      <ShellFullBleedBand className="shell-profile-content-band">
        <ShellInset className="pt-0">
          <div
            className={[
              'shell-profile-grid mt-card-padding grid grid-cols-1 gap-card-padding',
              'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
            ].join(' ')}
          >
            <div className="hidden min-w-0 lg:block">
              <ProfileLeftRailSkeleton />
            </div>
            <main className="min-h-[12rem] min-w-0">
              <FeedPostsLoadingSkeleton />
            </main>
          </div>
        </ShellInset>
      </ShellFullBleedBand>
    </div>
  );
}
