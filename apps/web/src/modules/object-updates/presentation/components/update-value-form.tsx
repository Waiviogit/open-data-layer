'use client';

import { useEffect, useMemo, useState } from 'react';

import type { UpdateDefinition } from '@opden-data-layer/core/update-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import {
  coerceFormValueForValidation,
  geoFormValueFromRaw,
  getJsonFieldDescriptors,
  initialValueForDefinition,
  validateUpdateValue,
  type GeoFormValue,
  type JsonFieldDescriptor,
} from '../../application/update-value-form.utils';
import { GeoUpdateForm } from './geo-update-form';
import { MenuItemForm } from './menu-item-form';
import { ObjectRefSearchField } from './object-ref-search-field';
import { TagCategoryItemForm } from './tag-category-item-form';
import { UserRefSearchField } from './user-ref-search-field';
import { WalletAddressForm } from './wallet-address-form';

export type UpdateValueFormProps = {
  updateType: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onValidityChange: (valid: boolean) => void;
  /** Existing `tagCategory` names (for `tagCategoryItem` category picker). */
  tagCategoryNames?: readonly string[];
  /** When true (left-rail modal), omit update-type title — type is chosen in the suggest-field select. */
  hideUpdateTypeHeading?: boolean;
};

export function UpdateValueForm({
  updateType,
  value,
  onChange,
  onValidityChange,
  tagCategoryNames = [],
  hideUpdateTypeHeading = false,
}: UpdateValueFormProps) {
  const definition = UPDATE_REGISTRY[updateType];

  useEffect(() => {
    if (!definition) {
      onValidityChange(false);
      return;
    }
    const result = validateUpdateValue(definition, value);
    onValidityChange(result.success);
  }, [definition, value, onValidityChange]);

  if (!definition) {
    return (
      <p className="text-sm text-muted">Unknown update type: {updateType}</p>
    );
  }

  return (
    <UpdateValueFields
      definition={definition}
      updateType={updateType}
      value={value}
      onChange={onChange}
      tagCategoryNames={tagCategoryNames}
      hideUpdateTypeHeading={hideUpdateTypeHeading}
    />
  );
}

type UpdateValueFieldsProps = {
  definition: UpdateDefinition;
  updateType: string;
  value: unknown;
  onChange: (value: unknown) => void;
  tagCategoryNames: readonly string[];
  hideUpdateTypeHeading: boolean;
};

function UpdateValueFields({
  definition,
  updateType,
  value,
  onChange,
  tagCategoryNames,
  hideUpdateTypeHeading,
}: UpdateValueFieldsProps) {
  const label = hideUpdateTypeHeading ? undefined : labelForUpdateType(updateType);

  if (updateType === UPDATE_TYPES.DELEGATION) {
    const accountName = typeof value === 'string' ? value : '';
    return (
      <UserRefSearchField
        label={label}
        value={accountName}
        onChange={(name) => onChange(name)}
      />
    );
  }

  if (definition.value_kind === 'object_ref') {
    const objectId = typeof value === 'string' ? value : '';
    return (
      <ObjectRefSearchField
        label={label}
        value={objectId}
        appliesTo={definition.applies_to}
        onChange={(id) => onChange(id)}
      />
    );
  }

  if (definition.value_kind === 'text') {
    const text = typeof value === 'string' ? value : '';
    const inputType =
      updateType === 'email' ? 'email' : updateType === 'url' ? 'url' : 'text';

    return (
      <label className="block text-sm">
        {label ? <span className="font-medium text-fg">{label}</span> : null}
        {text.length > 80 ? (
          <textarea
            className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-sm text-fg"
            rows={4}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={inputType}
            className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-sm text-fg"
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </label>
    );
  }

  if (definition.value_kind === 'geo') {
    return (
      <GeoUpdateForm
        value={value}
        onChange={onChange}
        label={label ?? ''}
        hideLegend={hideUpdateTypeHeading}
      />
    );
  }

  if (definition.value_kind === 'json') {
    if (updateType === UPDATE_TYPES.MENU_ITEM) {
      return <MenuItemForm value={value} onChange={onChange} />;
    }
    if (updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM) {
      return (
        <TagCategoryItemForm
          value={value}
          onChange={onChange}
          categories={tagCategoryNames}
        />
      );
    }
    if (updateType === UPDATE_TYPES.WALLET_ADDRESS) {
      return <WalletAddressForm value={value} onChange={onChange} />;
    }
    return (
      <JsonValueFields
        definition={definition}
        label={label}
        value={value}
        onChange={onChange}
        hideLegend={hideUpdateTypeHeading}
      />
    );
  }

  return null;
}

function JsonValueFields({
  definition,
  label,
  value,
  onChange,
  hideLegend = false,
}: {
  definition: UpdateDefinition;
  label: string | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
  hideLegend?: boolean;
}) {
  const fields = useMemo(
    () => getJsonFieldDescriptors(definition.schema),
    [definition.schema],
  );

  if (!fields || fields.length === 0) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const validation = validateUpdateValue(definition, text);
    return (
      <label className="block text-sm">
        {label ? (
          <span className="font-medium text-fg">{label} (JSON)</span>
        ) : null}
        <textarea
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 font-mono text-xs text-fg"
          rows={8}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
        {!validation.success ? (
          <p className="mt-1 text-caption text-accent">Invalid JSON for this update type</p>
        ) : null}
      </label>
    );
  }

  const obj = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    unknown
  >;

  return (
    <fieldset className="space-y-3 text-sm">
      {label && !hideLegend ? (
        <legend className="font-medium text-fg">{label}</legend>
      ) : (
        <legend className="sr-only">{definition.update_type}</legend>
      )}
      {fields.map((field) => (
        <JsonShapeField
          key={field.key}
          field={field}
          value={obj[field.key]}
          onFieldChange={(next) => onChange({ ...obj, [field.key]: next })}
        />
      ))}
    </fieldset>
  );
}

function JsonShapeField({
  field,
  value,
  onFieldChange,
}: {
  field: JsonFieldDescriptor;
  value: unknown;
  onFieldChange: (v: unknown) => void;
}) {
  const label = `${field.key}${field.optional ? '' : ' *'}`;

  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onFieldChange(e.target.checked)}
        />
        <span className="text-fg">{label}</span>
      </label>
    );
  }

  if (field.kind === 'enum' && field.enumValues) {
    return (
      <label className="block">
        <span className="text-muted">{label}</span>
        <select
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={String(value ?? field.enumValues[0] ?? '')}
          onChange={(e) => onFieldChange(e.target.value)}
        >
          {field.enumValues.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === 'number') {
    return (
      <label className="block">
        <span className="text-muted">{label}</span>
        <input
          type="number"
          step="any"
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={value === '' || value === undefined ? '' : String(value)}
          onChange={(e) => onFieldChange(e.target.value)}
        />
      </label>
    );
  }

  if (field.kind === 'string_array') {
    const text = Array.isArray(value)
      ? value.join('\n')
      : typeof value === 'string'
        ? value
        : '';
    return (
      <label className="block">
        <span className="text-muted">{label} (one per line)</span>
        <textarea
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          rows={3}
          value={text}
          onChange={(e) => onFieldChange(e.target.value)}
        />
      </label>
    );
  }

  if (field.kind === 'json') {
    const text =
      typeof value === 'string'
        ? value
        : value !== undefined
          ? JSON.stringify(value, null, 2)
          : '{}';
    return (
      <label className="block">
        <span className="text-muted">{label} (JSON)</span>
        <textarea
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 font-mono text-xs text-fg"
          rows={4}
          value={text}
          onChange={(e) => onFieldChange(e.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-muted">{label}</span>
      <input
        type="text"
        className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onFieldChange(e.target.value)}
      />
    </label>
  );
}

export { initialValueForDefinition, validateUpdateValue, coerceFormValueForValidation };
