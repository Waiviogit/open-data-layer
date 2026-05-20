'use client';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

export type UpdateTypeSelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (updateType: string) => void;
  disabled?: boolean;
  id?: string;
};

export function UpdateTypeSelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  id,
}: UpdateTypeSelectFieldProps) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <select
        id={id}
        className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg disabled:cursor-default disabled:opacity-100 disabled:text-fg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-disabled={disabled}
      >
        {options.map((type) => (
          <option key={type} value={type}>
            {labelForUpdateType(type)}
          </option>
        ))}
      </select>
    </label>
  );
}
