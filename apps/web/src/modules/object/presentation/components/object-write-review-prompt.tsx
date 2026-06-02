'use client';

export type ObjectWriteReviewPromptProps = {
  /** Mock-only affordance — wire to composer later */
  onPress?: () => void;
};

export function ObjectWriteReviewPrompt({
  onPress,
}: ObjectWriteReviewPromptProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-surface/60 p-card-padding text-left transition-colors hover:bg-surface"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-body-lg font-weight-strong font-display text-accent-fg"
        aria-hidden
      >
        +
      </span>
      <span className="text-body-sm font-weight-label text-fg">Write a new review</span>
    </button>
  );
}
