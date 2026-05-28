'use client';

import { useEffect } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

export type TagCategoryItemFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  /** Existing `tagCategory` names on the object. */
  categories: readonly string[];
  /** Focus tag value input when a new row is opened. */
  autoFocus?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function TagCategoryItemForm({
  value,
  onChange,
  categories,
  autoFocus = false,
}: TagCategoryItemFormProps) {
  const { t } = useI18n();
  const obj = asRecord(value);
  const category =
    typeof obj.category === 'string' ? obj.category : '';
  const tagValue = typeof obj.value === 'string' ? obj.value : '';

  function patch(next: Record<string, unknown>) {
    onChange({ ...obj, ...next });
  }

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }
    const cat = typeof obj.category === 'string' ? obj.category.trim() : '';
    if (!cat || !categories.includes(cat)) {
      onChange({
        category: categories[0],
        value: typeof obj.value === 'string' ? obj.value : '',
      });
    }
  }, [categories, obj.category, obj.value, onChange]);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted" role="status">
        {t('object_edit_tag_item_no_categories')}
      </p>
    );
  }

  const selectedCategory =
    category && categories.includes(category) ? category : categories[0] ?? '';

  return (
    <fieldset className="space-y-3 text-sm">
      <label className="block">
        <span className="font-medium text-fg">{t('object_edit_tag_item_category')}</span>
        <select
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={selectedCategory}
          onChange={(e) => patch({ category: e.target.value })}
        >
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-medium text-fg">{t('object_edit_tag_item_value')}</span>
        <input
          type="text"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={tagValue}
          autoFocus={autoFocus}
          onChange={(e) => patch({ value: e.target.value, category: selectedCategory })}
        />
      </label>
    </fieldset>
  );
}
