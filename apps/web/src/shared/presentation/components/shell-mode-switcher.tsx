'use client';

import {
  shellModeRegistry,
  useShellMode,
  type ShellModePreference,
} from '@/shell-mode';

const OPTIONS: { id: ShellModePreference; label: string }[] = [
  { id: 'default', label: shellModeRegistry.default.label },
  { id: 'twitter', label: shellModeRegistry.twitter.label },
  { id: 'instagram', label: shellModeRegistry.instagram.label },
  { id: 'compact', label: shellModeRegistry.compact.label },
];

export function ShellModeSwitcher() {
  const { preference, setPreference } = useShellMode();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Shell mode"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => void setPreference(opt.id)}
            className={`rounded-btn border px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-surface text-fg hover:bg-bg'
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
