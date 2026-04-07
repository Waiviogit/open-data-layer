type PlaceholderSlotProps = {
  label: string;
  /** CSS height, e.g. `100%` or `12rem` */
  height?: string;
  className?: string;
};

/**
 * Dashed outline region for layout demos and rapid prototyping.
 */
export function PlaceholderSlot({
  label,
  height = '8rem',
  className = '',
}: PlaceholderSlotProps) {
  return (
    <div
      style={{ minHeight: height }}
      className={[
        'flex min-h-[4rem] items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-alt px-card-padding text-center text-caption text-fg-secondary',
        className,
      ].join(' ')}
    >
      {label}
    </div>
  );
}
