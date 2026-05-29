'use client';

import { useMemo, useState } from 'react';

import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { UpdateValueForm } from '@/modules/object-updates/presentation/components/update-value-form';

import type { AddFieldOptions } from '../../domain/add-field-options';
import {
  isTagCategoryItemFilled,
  tagCategoryItemParts,
} from '../../domain/tag-category-item-value';
import {
  allEditableTypesForObjectType,
  getSemanticBlocks,
  groupFieldsByPriority,
  type SemanticBlockId,
} from '../../domain/group-fields-by-priority';
import { allowsMultipleUpdateRows } from '../../domain/allows-multiple-update-rows';
import {
  excludedRefValuesForEntry,
  isDuplicateRefValue,
} from '../../domain/duplicate-ref-field-values';
import { formatDuplicateRefMessage } from '../../domain/format-duplicate-ref-message';
import type { FieldEntry } from '../../domain/object-create.types';
import { AddFieldPopover } from './add-field-popover';

export type CoreFieldsEditorProps = {
  objectType: string;
  fields: readonly FieldEntry[];
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  onRemoveField: (entryKey: string) => void;
  disabled?: boolean;
};

const BLOCK_I18N: Record<SemanticBlockId, string> = {
  required: 'object_create_fields_required',
  identity: 'object_create_block_identity',
  context: 'object_create_block_context',
  classification: 'object_create_block_classification',
  advanced: 'object_create_block_advanced',
};

export function CoreFieldsEditor({
  objectType,
  fields,
  tagCategoryNames,
  galleryAlbumNames,
  onUpdateField,
  onAddField,
  onRemoveField,
  disabled = false,
}: CoreFieldsEditorProps) {
  const { t } = useI18n();
  const groups = useMemo(() => groupFieldsByPriority(objectType), [objectType]);
  const semanticBlocks = useMemo(
    () => getSemanticBlocks(objectType),
    [objectType],
  );
  const requiredSet = useMemo(() => new Set(groups.required), [groups.required]);

  const addableTypes = useMemo(() => {
    return allEditableTypesForObjectType(objectType).filter((type) => {
      if (
        type === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
        tagCategoryNames.length === 0
      ) {
        return false;
      }
      if (
        type === UPDATE_TYPES.IMAGE_GALLERY_ITEM &&
        galleryAlbumNames.length === 0
      ) {
        return false;
      }
      const def = UPDATE_REGISTRY[type];
      const rowCount = fields.filter((f) => f.updateType === type).length;
      if (def?.cardinality === 'multi') {
        return true;
      }
      return rowCount === 0;
    });
  }, [objectType, fields, tagCategoryNames, galleryAlbumNames]);

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <h2 className="text-section font-display text-heading">
        {t('object_create_core_fields')}
      </h2>

      <div className="mt-4 space-y-6">
        {semanticBlocks.map((block) => (
          <SemanticBlock
            key={block.id}
            blockId={block.id}
            title={t(BLOCK_I18N[block.id])}
            types={block.types}
            fields={fields}
            requiredSet={requiredSet}
            tagCategoryNames={tagCategoryNames}
            galleryAlbumNames={galleryAlbumNames}
            onUpdateField={onUpdateField}
            onAddField={onAddField}
            onRemoveField={onRemoveField}
            disabled={disabled}
            allowRemove={
              block.id !== 'identity' && block.id !== 'required'
            }
            emphasize={block.id === 'required'}
          />
        ))}
      </div>

      <AddFieldPopover
        candidateTypes={addableTypes}
        onAddField={onAddField}
        disabled={disabled}
      />
    </section>
  );
}

function SemanticBlock({
  blockId,
  title,
  types,
  fields,
  requiredSet,
  tagCategoryNames,
  galleryAlbumNames,
  onUpdateField,
  onAddField,
  onRemoveField,
  disabled,
  allowRemove,
  emphasize = false,
}: {
  blockId: SemanticBlockId;
  title: string;
  types: readonly string[];
  fields: readonly FieldEntry[];
  requiredSet: Set<string>;
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  onRemoveField: (entryKey: string) => void;
  disabled?: boolean;
  allowRemove: boolean;
  emphasize?: boolean;
}) {
  if (types.length === 0) {
    return null;
  }

  return (
    <section
      className={
        emphasize
          ? 'rounded-btn border border-accent/30 bg-accent/5 p-4'
          : 'rounded-btn border border-border-subtle bg-bg/50 p-4'
      }
    >
      <h3 className="text-body-sm font-semibold uppercase tracking-wide text-heading">
        {title}
      </h3>
      <div className="mt-4 space-y-6">
        {types.map((updateType) => (
          <UpdateTypeSection
            key={updateType}
            updateType={updateType}
            fields={fields}
            requiredSet={requiredSet}
            tagCategoryNames={tagCategoryNames}
            galleryAlbumNames={galleryAlbumNames}
            onUpdateField={onUpdateField}
            onAddField={onAddField}
            onRemoveField={onRemoveField}
            disabled={disabled}
            allowRemove={allowRemove}
            showTagPills={blockId === 'classification'}
          />
        ))}
      </div>
    </section>
  );
}

function UpdateTypeSection({
  updateType,
  fields,
  requiredSet,
  tagCategoryNames,
  galleryAlbumNames,
  onUpdateField,
  onAddField,
  onRemoveField,
  disabled,
  allowRemove,
  showTagPills,
}: {
  updateType: string;
  fields: readonly FieldEntry[];
  requiredSet: Set<string>;
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  onRemoveField: (entryKey: string) => void;
  disabled?: boolean;
  allowRemove: boolean;
  showTagPills: boolean;
}) {
  const rows = fields.filter((f) => f.updateType === updateType);
  const allowsMultiple = allowsMultipleUpdateRows(updateType);
  const isRequired = requiredSet.has(updateType);

  if (
    showTagPills &&
    updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
    tagCategoryNames.length > 0
  ) {
    return (
      <TagCategoryItemsGroup
        rows={rows}
        tagCategoryNames={tagCategoryNames}
        requiredSet={requiredSet}
        onUpdateField={onUpdateField}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        disabled={disabled}
        allowRemove={allowRemove}
      />
    );
  }

  if (rows.length === 0) {
    if (
      updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
      tagCategoryNames.length === 0
    ) {
      return null;
    }
    if (
      updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM &&
      galleryAlbumNames.length === 0
    ) {
      return null;
    }
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAddField(updateType)}
        className="text-body-sm text-accent hover:underline"
      >
        + {labelForUpdateType(updateType)}
        {isRequired ? ' *' : ''}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((entry) => (
        <FieldRow
          key={entry.entryKey}
          entry={entry}
          peerRows={rows}
          isRequired={isRequired}
          tagCategoryNames={tagCategoryNames}
          galleryAlbumNames={galleryAlbumNames}
          onUpdateField={onUpdateField}
          onRemoveField={onRemoveField}
          disabled={disabled}
          allowRemove={allowRemove}
          showTypeLabel={allowsMultiple || rows.length > 1}
        />
      ))}
      {allowsMultiple ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddField(updateType)}
          className="text-body-sm text-accent hover:underline"
        >
          + {labelForUpdateType(updateType)}
        </button>
      ) : null}
    </div>
  );
}

function TagCategoryItemsGroup({
  rows,
  tagCategoryNames,
  requiredSet,
  onUpdateField,
  onAddField,
  onRemoveField,
  disabled,
  allowRemove,
}: {
  rows: FieldEntry[];
  tagCategoryNames: readonly string[];
  requiredSet: Set<string>;
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  onRemoveField: (entryKey: string) => void;
  disabled?: boolean;
  allowRemove: boolean;
}) {
  const { t } = useI18n();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const isRequired = requiredSet.has(UPDATE_TYPES.TAG_CATEGORY_ITEM);

  const orderedRows = useMemo(() => {
    if (!editingKey) {
      return rows;
    }
    const editing = rows.find((r) => r.entryKey === editingKey);
    if (!editing) {
      return rows;
    }
    return [editing, ...rows.filter((r) => r.entryKey !== editingKey)];
  }, [rows, editingKey]);

  const addTagForCategory = (category: string) => {
    const suffix =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : String(Date.now());
    const entryKey = `${UPDATE_TYPES.TAG_CATEGORY_ITEM}:${category}:${suffix}`;
    onAddField(UPDATE_TYPES.TAG_CATEGORY_ITEM, {
      tagCategory: category,
      entryKey,
    });
    setEditingKey(entryKey);
  };

  return (
    <div className="space-y-3">
      <p className="text-body-sm font-medium text-fg">
        {labelForUpdateType(UPDATE_TYPES.TAG_CATEGORY_ITEM)}
        {isRequired ? (
          <span className="text-accent" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {orderedRows.map((entry) => {
          const { value: tagValue } = tagCategoryItemParts(entry.value);
          const isEmpty = !isTagCategoryItemFilled(entry.value);
          const isEditing = editingKey === entry.entryKey;
          return (
            <span
              key={entry.entryKey}
              className={[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-body-sm',
                isEmpty
                  ? 'border-dashed border-border-strong text-muted'
                  : 'border-border bg-ghost-surface text-fg',
              ].join(' ')}
            >
              <button
                type="button"
                disabled={disabled}
                className="hover:text-accent"
                onClick={() =>
                  setEditingKey(isEditing ? null : entry.entryKey)
                }
              >
                {tagValue || t('object_create_tag_chip_empty')}
              </button>
              {allowRemove ? (
                <button
                  type="button"
                  disabled={disabled}
                  className="text-caption text-muted hover:text-accent"
                  aria-label={t('object_create_remove_field')}
                  onClick={() => onRemoveField(entry.entryKey)}
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      {editingKey && rows.some((r) => r.entryKey === editingKey) ? (
        <FieldRow
          entry={rows.find((r) => r.entryKey === editingKey) as FieldEntry}
          peerRows={rows}
          isRequired={isRequired}
          tagCategoryNames={tagCategoryNames}
          galleryAlbumNames={[]}
          onUpdateField={onUpdateField}
          onRemoveField={onRemoveField}
          disabled={disabled}
          allowRemove={false}
          showTypeLabel={false}
          autoFocusTagValue
        />
      ) : null}
      {tagCategoryNames.map((category) => (
        <button
          key={category}
          type="button"
          disabled={disabled}
          onClick={() => addTagForCategory(category)}
          className="text-body-sm text-accent hover:underline"
        >
          + {labelForUpdateType(UPDATE_TYPES.TAG_CATEGORY_ITEM)} ({category})
        </button>
      ))}
    </div>
  );
}

function isEntryFilled(entry: FieldEntry): boolean {
  if (typeof entry.value === 'string') {
    return entry.value.trim().length > 0;
  }
  if (Array.isArray(entry.value)) {
    return entry.value.some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
  }
  if (entry.value && typeof entry.value === 'object') {
    return Object.values(entry.value as Record<string, unknown>).some((v) => {
      if (v === '' || v === null || v === undefined) {
        return false;
      }
      if (typeof v === 'string') {
        return v.trim().length > 0;
      }
      return true;
    });
  }
  return entry.value !== null && entry.value !== undefined;
}

function FieldRow({
  entry,
  peerRows,
  isRequired,
  tagCategoryNames,
  galleryAlbumNames,
  onUpdateField,
  onRemoveField,
  disabled,
  allowRemove,
  showTypeLabel,
  autoFocusTagValue = false,
}: {
  entry: FieldEntry;
  peerRows: readonly FieldEntry[];
  isRequired: boolean;
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onRemoveField: (entryKey: string) => void;
  disabled?: boolean;
  allowRemove: boolean;
  showTypeLabel: boolean;
  autoFocusTagValue?: boolean;
}) {
  const { t } = useI18n();
  const [valid, setValid] = useState(false);
  const [refDuplicateMessage, setRefDuplicateMessage] = useState<string | null>(
    null,
  );
  const fieldLabel = labelForUpdateType(entry.updateType);
  const excludedRefValues = excludedRefValuesForEntry(
    peerRows,
    entry.updateType,
    entry.entryKey,
  );
  const filled = isEntryFilled(entry);
  const heading =
    showTypeLabel && typeof entry.value === 'string' && entry.value.trim()
      ? `${labelForUpdateType(entry.updateType)} — ${entry.value}`
      : labelForUpdateType(entry.updateType);

  return (
    <div className="rounded-btn border border-border-subtle bg-bg p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body-sm font-medium text-heading">
          {!filled && isRequired ? (
            <span
              className="size-2 shrink-0 rounded-full bg-amber-500/80"
              title="Required"
              aria-hidden
            />
          ) : null}
          {heading}
          {isRequired ? (
            <span className="text-accent" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {allowRemove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemoveField(entry.entryKey)}
            className="text-caption text-muted hover:text-accent"
          >
            ×
          </button>
        ) : null}
      </div>
      <UpdateValueForm
        updateType={entry.updateType}
        value={entry.value}
        excludedRefValues={excludedRefValues}
        onChange={(v) => {
          if (
            isDuplicateRefValue(peerRows, entry.updateType, entry.entryKey, v)
          ) {
            setRefDuplicateMessage(
              formatDuplicateRefMessage(t, entry.updateType, fieldLabel, v),
            );
            return;
          }
          setRefDuplicateMessage(null);
          onUpdateField(entry.entryKey, v);
        }}
        onValidityChange={setValid}
        tagCategoryNames={tagCategoryNames}
        galleryAlbumNames={galleryAlbumNames}
        lockGalleryAlbum={
          entry.updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM &&
          /^imageGalleryItem:[^:]+:/.test(entry.entryKey)
        }
        hideUpdateTypeHeading
        autoFocusTagValue={autoFocusTagValue}
      />
      {refDuplicateMessage ? (
        <p className="mt-1 text-caption text-accent" role="alert">
          {refDuplicateMessage}
        </p>
      ) : !valid ? (
        <p className="mt-1 text-caption text-muted" aria-hidden>
          —
        </p>
      ) : null}
    </div>
  );
}
