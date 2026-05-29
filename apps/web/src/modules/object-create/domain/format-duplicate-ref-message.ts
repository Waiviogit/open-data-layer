import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { normalizeRefFieldValue } from './duplicate-ref-field-values';

export function formatDuplicateRefMessage(
  t: (key: string) => string,
  updateType: string,
  fieldLabel: string,
  value: unknown,
): string {
  const def = UPDATE_REGISTRY[updateType];
  const id = normalizeRefFieldValue(value);
  const field = fieldLabel.trim() || updateType;

  if (def?.value_kind === 'user_ref') {
    return t('object_create_duplicate_user_ref')
      .replace('{account}', id || '—')
      .replace('{field}', field);
  }
  if (def?.value_kind === 'object_ref') {
    return t('object_create_duplicate_object_ref')
      .replace('{object}', id || '—')
      .replace('{field}', field);
  }
  return t('object_create_duplicate_ref_value');
}
