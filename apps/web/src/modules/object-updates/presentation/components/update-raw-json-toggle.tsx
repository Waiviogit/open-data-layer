'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { formatUpdateRawJson } from '../../application/format-update-raw-json';

export type UpdateRawJsonToggleSlots = {
  button: ReactNode;
  panel: ReactNode;
};

export type UpdateRawJsonToggleMode = 'toggle' | 'always';

export type UpdateRawJsonToggleProps = {
  value: unknown;
  className?: string;
  mode?: UpdateRawJsonToggleMode;
  children?: (slots: UpdateRawJsonToggleSlots) => ReactNode;
};

export function UpdateRawJsonToggle({
  value,
  className,
  mode = 'toggle',
  children,
}: UpdateRawJsonToggleProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const alwaysVisible = mode === 'always';
  const shown = alwaysVisible || expanded;

  const jsonBlock = useMemo(() => formatUpdateRawJson(value), [value]);

  if (value == null) {
    return null;
  }

  const button = alwaysVisible ? null : (
    <button
      type="button"
      aria-expanded={expanded}
      className={`text-caption font-weight-label focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        expanded ? 'text-accent' : 'text-muted hover:text-accent'
      }`}
      onClick={() => setExpanded((v) => !v)}
    >
      <span aria-hidden>{'</>'}</span>{' '}
      {expanded ? t('object_updates_hide_json') : t('object_updates_view_json')}
    </button>
  );

  const panel = shown ? (
    <pre className="mt-2 max-h-80 overflow-auto rounded-btn border border-border bg-surface-alt p-3 font-mono text-caption text-fg">
      <code>{jsonBlock}</code>
    </pre>
  ) : null;

  if (children) {
    return <>{children({ button, panel })}</>;
  }

  return (
    <div className={className}>
      {button}
      {panel}
    </div>
  );
}
