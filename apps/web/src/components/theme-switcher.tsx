'use client';

import { themeRegistry } from '../theme/theme-registry';
import { useTheme } from '../theme/use-theme';
import type { ThemePreference } from '../theme/types';

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: themeRegistry.light.label },
  { id: 'dark', label: themeRegistry.dark.label },
  { id: 'sepia', label: themeRegistry.sepia.label },
  { id: 'system', label: 'System' },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => void setPreference(opt.id)}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
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
