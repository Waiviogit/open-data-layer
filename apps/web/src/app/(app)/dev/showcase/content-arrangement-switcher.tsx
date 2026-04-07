'use client';

import { useLayout } from '@/shared/presentation/layout';

const MODES = ['feed', 'grid', 'masonry'] as const;

export function ContentArrangementSwitcher() {
  const { contentArrangement, setContentArrangement } = useLayout();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Content arrangement"
    >
      {MODES.map((mode) => {
        const active = contentArrangement === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setContentArrangement(mode)}
            className={`rounded-btn border px-3 py-1.5 text-sm capitalize transition-colors ${
              active
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-surface text-fg hover:bg-bg'
            }`}
            aria-pressed={active}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}
