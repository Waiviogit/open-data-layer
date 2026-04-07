'use client';

export default function UserProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-container-narrow px-gutter py-section-y-hero text-center">
      <h2 className="text-xl font-semibold text-fg">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        We couldn&apos;t load this content right now. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
      >
        Try again
      </button>
    </div>
  );
}
