'use client';

export default function UserProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-container-narrow px-gutter py-section-y-hero text-center">
      <h2 className="text-section font-weight-strong font-display text-fg">Something went wrong</h2>
      <p className="mt-2 text-body-sm text-muted">
        We couldn&apos;t load this content right now. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-body-sm font-weight-label text-white hover:bg-accent/90"
      >
        Try again
      </button>
    </div>
  );
}
