'use client';

import { useMemo, useState } from 'react';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  OBJECT_TYPE_GROUPS,
  labelForObjectType,
} from '../../domain/object-type-display';

export type ObjectTypeSelectorProps = {
  selectedType: string | null;
  onSelect: (objectType: string) => void;
  disabled?: boolean;
};

export function ObjectTypeSelector({
  selectedType,
  onSelect,
  disabled = false,
}: ObjectTypeSelectorProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const allTypes = useMemo(
    () => Object.keys(OBJECT_TYPE_REGISTRY).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredSet = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return new Set(allTypes);
    }
    return new Set(
      allTypes.filter((type) => {
        const label = labelForObjectType(type).toLowerCase();
        return type.includes(q) || label.includes(q);
      }),
    );
  }, [allTypes, query]);

  const grouped = useMemo(() => {
    const assigned = new Set<string>();
    const rows: { label: string; types: string[] }[] = [];

    for (const group of OBJECT_TYPE_GROUPS) {
      const types = group.types.filter(
        (type) => OBJECT_TYPE_REGISTRY[type] && filteredSet.has(type),
      );
      for (const type of types) {
        assigned.add(type);
      }
      if (types.length > 0) {
        rows.push({ label: group.label, types });
      }
    }

    const other = allTypes.filter(
      (type) => filteredSet.has(type) && !assigned.has(type),
    );
    if (other.length > 0) {
      rows.push({ label: 'Other', types: other });
    }

    return rows;
  }, [allTypes, filteredSet]);

  const hasResults = grouped.some((g) => g.types.length > 0);

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <h2 className="text-section font-display text-heading">
        {t('object_create_type_label')}
      </h2>
      <input
        type="search"
        className="mt-3 w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg placeholder:text-muted"
        placeholder={t('object_create_type_search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        aria-label={t('object_create_type_search')}
      />

      <div className="mt-4 space-y-4">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-caption font-weight-label uppercase tracking-loose text-muted">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.types.map((type) => (
                <TypeChip
                  key={type}
                  type={type}
                  selected={selectedType === type}
                  onSelect={onSelect}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!hasResults ? (
        <p className="mt-4 text-body-sm text-muted">{t('object_create_type_no_match')}</p>
      ) : null}
    </section>
  );
}

function TypeChip({
  type,
  selected,
  onSelect,
  disabled,
}: {
  type: string;
  selected: boolean;
  onSelect: (type: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(type)}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm transition-colors',
        selected
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border bg-bg text-fg hover:border-accent hover:bg-ghost-surface',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={selected}
    >
      {selected ? (
        <span className="text-caption" aria-hidden>
          ✓
        </span>
      ) : null}
      {labelForObjectType(type)}
    </button>
  );
}
