'use client';

import { useEffect, useMemo, useState } from 'react';

import type { UpdateDefinition } from '@opden-data-layer/core/update-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  coerceFormValueForValidation,
  geoFormValueFromRaw,
  getJsonFieldDescriptors,
  initialValueForDefinition,
  unwrapRootStringArraySchema,
  validateUpdateValue,
  type GeoFormValue,
  type JsonFieldDescriptor,
} from '../../application/update-value-form.utils';
import { GeoUpdateForm } from './geo-update-form';
import { ImageCidOrUrlForm } from './image-cid-or-url-form';
import { ImageGalleryItemForm } from './image-gallery-item-form';
import { isImageCidOrUrlUpdateType } from '../../application/image-form-value';
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
  /** Existing gallery album names (for `imageGalleryItem` album picker). */
  galleryAlbumNames?: readonly string[];
  /** When true, `imageGalleryItem` album field is read-only. */
  lockGalleryAlbum?: boolean;
  /** When true (left-rail modal), omit update-type title — type is chosen in the suggest-field select. */
  hideUpdateTypeHeading?: boolean;
  /** Focus tag value input when adding a new `tagCategoryItem` row. */
  autoFocusTagValue?: boolean;
  /** Other rows' ref values to exclude from user/object search (same update type). */
  excludedRefValues?: readonly string[];
};

export function UpdateValueForm({
  updateType,
  value,
  onChange,
  onValidityChange,
  tagCategoryNames = [],
  galleryAlbumNames = [],
  lockGalleryAlbum = false,
  hideUpdateTypeHeading = false,
  autoFocusTagValue = false,
  excludedRefValues = [],
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
      <p className="text-body-sm text-muted">Unknown update type: {updateType}</p>
    );
  }

  return (
    <UpdateValueFields
      definition={definition}
      updateType={updateType}
      value={value}
      onChange={onChange}
      tagCategoryNames={tagCategoryNames}
      galleryAlbumNames={galleryAlbumNames}
      lockGalleryAlbum={lockGalleryAlbum}
      hideUpdateTypeHeading={hideUpdateTypeHeading}
      autoFocusTagValue={autoFocusTagValue}
      excludedRefValues={excludedRefValues}
    />
  );
}

type UpdateValueFieldsProps = {
  definition: UpdateDefinition;
  updateType: string;
  value: unknown;
  onChange: (value: unknown) => void;
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  lockGalleryAlbum: boolean;
  hideUpdateTypeHeading: boolean;
  autoFocusTagValue: boolean;
  excludedRefValues: readonly string[];
};

function UpdateValueFields({
  definition,
  updateType,
  value,
  onChange,
  tagCategoryNames,
  galleryAlbumNames,
  lockGalleryAlbum,
  hideUpdateTypeHeading,
  autoFocusTagValue,
  excludedRefValues,
}: UpdateValueFieldsProps) {
  const { t } = useI18n();
  const label = hideUpdateTypeHeading ? undefined : labelForUpdateType(updateType);
  const fieldLabel = labelForUpdateType(updateType);

  if (definition.value_kind === 'user_ref') {
    const accountName = typeof value === 'string' ? value : '';
    return (
      <UserRefSearchField
        label={label}
        fieldLabel={fieldLabel}
        updateType={updateType}
        value={accountName}
        excludeAccountNames={excludedRefValues}
        onChange={(name) => onChange(name)}
      />
    );
  }

  if (definition.value_kind === 'object_ref') {
    const objectId = typeof value === 'string' ? value : '';
    return (
      <ObjectRefSearchField
        label={label}
        fieldLabel={fieldLabel}
        updateType={updateType}
        value={objectId}
        appliesTo={definition.applies_to}
        excludeObjectIds={excludedRefValues}
        onChange={(id) => onChange(id)}
      />
    );
  }

  if (definition.value_kind === 'text') {
    const text = typeof value === 'string' ? value : '';
    const inputType =
      updateType === 'email' ? 'email' : updateType === 'url' ? 'url' : 'text';
    const placeholder =
      updateType === UPDATE_TYPES.IMAGE_GALLERY ? t('add_new_album_placeholder') : undefined;

    return (
      <label className="block text-body-sm">
        {label ? <span className="font-weight-label text-fg">{label}</span> : null}
        {text.length > 80 ? (
          <textarea
            className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg"
            rows={4}
            value={text}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={inputType}
            className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg"
            value={text}
            placeholder={placeholder}
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
    if (isImageCidOrUrlUpdateType(updateType)) {
      return (
        <ImageCidOrUrlForm
          value={value}
          onChange={onChange}
          label={label}
          hideLegend={hideUpdateTypeHeading}
        />
      );
    }
    if (updateType === UPDATE_TYPES.MENU_ITEM) {
      return <MenuItemForm value={value} onChange={onChange} />;
    }
    if (updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM) {
      return (
        <TagCategoryItemForm
          value={value}
          onChange={onChange}
          categories={tagCategoryNames}
          autoFocus={autoFocusTagValue}
        />
      );
    }
    if (updateType === UPDATE_TYPES.WALLET_ADDRESS) {
      return <WalletAddressForm value={value} onChange={onChange} />;
    }
    if (updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
      return (
        <ImageGalleryItemForm
          value={value}
          onChange={onChange}
          albumNames={galleryAlbumNames}
          lockAlbum={lockGalleryAlbum}
        />
      );
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
  const rootStringArray = useMemo(
    () => unwrapRootStringArraySchema(definition.schema),
    [definition.schema],
  );
  const fields = useMemo(
    () => getJsonFieldDescriptors(definition.schema),
    [definition.schema],
  );

  if (rootStringArray) {
    const text = Array.isArray(value)
      ? value.join('\n')
      : typeof value === 'string'
        ? value
        : '';
    const validation = validateUpdateValue(definition, text);
    const fieldLabel = label ?? definition.update_type;
    return (
      <label className="block text-body-sm">
        {hideLegend ? (
          <span className="sr-only">{fieldLabel}</span>
        ) : (
          <span className="font-weight-label text-fg">{fieldLabel}</span>
        )}
        <span className={hideLegend ? 'block text-muted' : 'mt-1 block text-muted'}>
          (one per line)
        </span>
        <textarea
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          rows={5}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
        {!validation.success ? (
          <p className="mt-1 text-caption text-accent">
            Add at least one non-empty line
          </p>
        ) : null}
      </label>
    );
  }

  if (!fields || fields.length === 0) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const validation = validateUpdateValue(definition, text);
    return (
      <label className="block text-body-sm">
        {label ? (
          <span className="font-weight-label text-fg">{label} (JSON)</span>
        ) : null}
        <textarea
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 font-mono text-caption text-fg"
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
    <fieldset className="space-y-3 text-body-sm">
      {label && !hideLegend ? (
        <legend className="font-weight-label text-fg">{label}</legend>
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
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 font-mono text-caption text-fg"
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
