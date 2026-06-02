'use client';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import type { UpdateTypeOption } from './update-filter-bar';

export type UpdateTypeSelectFieldProps = {
  label: string;
  value: string;
  options: readonly UpdateTypeOption[];
  onChange: (updateType: string) => void;
  disabled?: boolean;
  id?: string;
};

function optionLabel(option: UpdateTypeOption): string {
  return option.label || labelForUpdateType(option.value);
}

export function UpdateTypeSelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  id,
}: UpdateTypeSelectFieldProps) {
  return (
    <label className="block text-body-sm">
      <span className="text-muted">{label}</span>
      <select
        id={id}
        className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg disabled:cursor-default disabled:opacity-100 disabled:text-fg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
