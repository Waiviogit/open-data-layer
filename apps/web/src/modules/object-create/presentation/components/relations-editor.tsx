'use client';

import { useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { UpdateValueForm } from '@/modules/object-updates/presentation/components/update-value-form';

import {
  excludedRefValuesForEntry,
  isDuplicateRefValue,
} from '../../domain/duplicate-ref-field-values';
import { formatDuplicateRefMessage } from '../../domain/format-duplicate-ref-message';
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
  const [refDuplicateByEntry, setRefDuplicateByEntry] = useState<
    Record<string, string>
  >({});

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
            const excludedRefValues = excludedRefValuesForEntry(
              rows,
              updateType,
              entry.entryKey,
            );
            const duplicateMessage = refDuplicateByEntry[entry.entryKey];
            const fieldLabel = labelForUpdateType(updateType);

            return (
              <div key={entry.entryKey}>
                <UpdateValueForm
                  updateType={updateType}
                  value={entry.value}
                  excludedRefValues={excludedRefValues}
                  onChange={(v) => {
                    if (
                      isDuplicateRefValue(rows, updateType, entry.entryKey, v)
                    ) {
                      setRefDuplicateByEntry((prev) => ({
                        ...prev,
                        [entry.entryKey]: formatDuplicateRefMessage(
                          t,
                          updateType,
                          fieldLabel,
                          v,
                        ),
                      }));
                      return;
                    }
                    setRefDuplicateByEntry((prev) => {
                      const next = { ...prev };
                      delete next[entry.entryKey];
                      return next;
                    });
                    onUpdateField(entry.entryKey, v);
                  }}
                  onValidityChange={() => {}}
                  hideUpdateTypeHeading={false}
                />
                {duplicateMessage ? (
                  <p className="mt-1 text-caption text-accent" role="alert">
                    {duplicateMessage}
                  </p>
                ) : null}
              </div>
            );
          });
        })}
      </div>
    </section>
  );
}
