import { ObjectViewShell } from './object-view-shell';

function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-btn bg-surface-control ${className}`} aria-hidden />;
}

function ObjectPageHeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-whisper" aria-hidden>
      <PulseBlock className="h-32 w-full rounded-none sm:h-40" />
      <div className="relative px-card-padding pb-card-padding pt-12">
        <div className="absolute -top-10 start-card-padding">
          <PulseBlock className="size-20 rounded-circle border-4 border-surface" />
        </div>
        <div className="space-y-2 pt-2">
          <PulseBlock className="h-7 max-w-[16rem]" />
          <PulseBlock className="h-4 max-w-[10rem]" />
          <PulseBlock className="h-4 max-w-[14rem]" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <PulseBlock className="h-9 w-24" />
          <PulseBlock className="h-9 w-24" />
          <PulseBlock className="h-9 w-9 rounded-circle" />
        </div>
        <div className="mt-4 flex gap-4 border-t border-border pt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <PulseBlock key={i} className="h-4 w-16" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectPageLeftRailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <PulseBlock className="h-4 w-20" />
      {Array.from({ length: 4 }).map((_, i) => (
        <PulseBlock key={i} className="h-8 w-full" />
      ))}
      <PulseBlock className="mt-6 h-4 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <PulseBlock key={`b-${i}`} className="h-6 w-full" />
      ))}
    </div>
  );
}

export function ObjectPageCenterSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <PulseBlock className="h-5 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface/80 p-card-padding shadow-whisper">
          <div className="flex gap-3">
            <PulseBlock className="size-16 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <PulseBlock className="h-4 w-3/4" />
              <PulseBlock className="h-3 w-1/2" />
              <PulseBlock className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ObjectPageRightRailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="space-y-2">
          <PulseBlock className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <PulseBlock className="size-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <PulseBlock className="h-3 w-full" />
                <PulseBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ObjectPageUpdatesFeedSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <PulseBlock key={i} className="h-8 w-20" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface/80 p-card-padding">
          <div className="flex gap-3">
            <PulseBlock className="size-10 shrink-0 rounded-circle" />
            <div className="min-w-0 flex-1 space-y-2">
              <PulseBlock className="h-4 w-32" />
              <PulseBlock className="h-3 w-full" />
              <PulseBlock className="h-3 w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Route-level loading shell — mirrors {@link ObjectViewShell} layout. */
export function ObjectPageLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading object">
      <ObjectViewShell
        hero={<ObjectPageHeroSkeleton />}
        leftRail={<ObjectPageLeftRailSkeleton />}
        center={<ObjectPageCenterSkeleton />}
        rightRail={<ObjectPageRightRailSkeleton />}
      />
    </div>
  );
}
