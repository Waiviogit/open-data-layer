/**
 * Shown immediately when a soft navigation triggers the @modal parallel slot
 * (before the async RSC page finishes fetching).
 * Mirrors the PostInterceptModalShell + BlogPostScreen layout so the transition
 * from skeleton → content is visually seamless.
 */
export default function ModalLoadingSkeleton() {
  return (
    <>
      <div className="fixed inset-0 z-[100] bg-overlay/70 backdrop-blur-[2px]" aria-hidden />
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-start px-4 py-8 sm:px-6">
          <div className="flex w-full max-w-container-post items-start gap-3">
            <div className="min-w-0 flex-1 animate-pulse rounded-sm border-0 bg-surface shadow-card-float">
              {/* Mobile close bar placeholder */}
              <div className="flex items-center justify-end border-b border-border px-4 py-2 lg:hidden">
                <div className="size-8 rounded-circle bg-surface-control" />
              </div>

              <div className="px-6 py-5 sm:px-8 sm:py-6">
                {/* Title */}
                <div className="h-7 w-3/4 rounded bg-surface-control" />
                <div className="mt-2 h-5 w-1/2 rounded bg-surface-control" />

                {/* Author row */}
                <div className="mt-4 flex gap-3">
                  <div className="size-10 shrink-0 rounded-circle bg-surface-control" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-4 w-32 rounded bg-surface-control" />
                    <div className="h-3 w-20 rounded bg-surface-control" />
                  </div>
                </div>

                {/* Body lines */}
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-full rounded bg-surface-control" />
                  <div className="h-4 w-full rounded bg-surface-control" />
                  <div className="h-4 w-5/6 rounded bg-surface-control" />
                  <div className="h-4 w-full rounded bg-surface-control" />
                  <div className="h-4 w-4/5 rounded bg-surface-control" />
                  <div className="h-4 w-full rounded bg-surface-control" />
                  <div className="h-4 w-3/4 rounded bg-surface-control" />
                </div>

                {/* Footer bar */}
                <div className="mt-6 border-t border-border pt-3">
                  <div className="h-8 w-32 rounded bg-surface-control" />
                </div>
              </div>
            </div>

            {/* Desktop pill skeletons */}
            <div className="hidden shrink-0 flex-col gap-2 pt-4 lg:flex">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="size-9 animate-pulse rounded-circle bg-surface-control" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
