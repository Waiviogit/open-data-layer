'use client';

import { useMemo } from 'react';

import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { ObjectRefSearchField } from '@/modules/object-updates/presentation/components/object-ref-search-field';
import { UserRefSearchField } from '@/modules/object-updates/presentation/components/user-ref-search-field';

import { relationTypesForObjectType } from '../../domain/group-fields-by-priority';
import type { FieldEntry } from '../../domain/object-create.types';

export type RelationsEditorProps = {
  objectType: string;
  fields: readonly FieldEntry[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string) => void;
  disabled?: boolean;
};

export function RelationsEditor({
  objectType,
  fields,
  onUpdateField,
  onAddField,
  disabled = false,
}: RelationsEditorProps) {
  const { t } = useI18n();
  const relationTypes = useMemo(
    () => relationTypesForObjectType(objectType),
    [objectType],
  );

  if (relationTypes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <h2 className="text-section font-display text-heading">
        {t('object_create_relations')}
      </h2>
      <p className="mt-1 text-body-sm text-fg-secondary">
        {t('object_create_relations_hint')}
      </p>

      <div className="mt-4 space-y-4">
        {relationTypes.map((updateType) => {
          const rows = fields.filter((f) => f.updateType === updateType);
          const def = UPDATE_REGISTRY[updateType];
          const appliesTo = def?.applies_to;

          if (rows.length === 0) {
            return (
              <button
                key={updateType}
                type="button"
                disabled={disabled}
                onClick={() => onAddField(updateType)}
                className="block text-body-sm text-accent hover:underline"
              >
                + {labelForUpdateType(updateType)}
              </button>
            );
          }

          return rows.map((entry) => {
            const value = typeof entry.value === 'string' ? entry.value : '';
            if (updateType === UPDATE_TYPES.DELEGATION) {
              return (
                <UserRefSearchField
                  key={entry.entryKey}
                  label={labelForUpdateType(updateType)}
                  value={value}
                  onChange={(accountName) =>
                    onUpdateField(entry.entryKey, accountName)
                  }
                />
              );
            }
            return (
              <ObjectRefSearchField
                key={entry.entryKey}
                label={labelForUpdateType(updateType)}
                value={value}
                appliesTo={appliesTo}
                onChange={(objectId) => onUpdateField(entry.entryKey, objectId)}
              />
            );
          });
        })}
      </div>
    </section>
  );
}
