import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import {
  buildCustomJsonOp,
  type OdlUpdateCreateValueKind,
} from '@opden-data-layer/hive-broadcast';

import { validateUpdateValue } from '@/modules/object-updates/application/update-value-form.utils';

import { groupFieldsByPriority } from '../domain/group-fields-by-priority';
import { isEntryValid } from '../domain/object-health-score';
import type { FieldEntry } from '../domain/object-create.types';

function resolveValueFieldKey(valueKind: OdlUpdateCreateValueKind): string {
  if (valueKind === 'object_ref') {
    return 'value_text';
  }
  return `value_${valueKind}`;
}

function buildUpdateCreateEventPayload(
  objectId: string,
  creator: string,
  entry: FieldEntry,
): Record<string, unknown> | null {
  const definition = UPDATE_REGISTRY[entry.updateType];
  if (!definition) {
    return null;
  }
  const parsed = validateUpdateValue(definition, entry.value);
  if (!parsed.success) {
    return null;
  }

  const valueField = resolveValueFieldKey(definition.value_kind);
  const payload: Record<string, unknown> = {
    object_id: objectId,
    update_type: entry.updateType,
    creator,
    [valueField]: parsed.value,
  };
  if (definition.localizable && entry.locale) {
    payload['locale'] = entry.locale;
  }
  return payload;
}

export type BuildCreateOpsInput = {
  objectId: string;
  objectType: string;
  creator: string;
  odlCustomJsonId: string;
  fields: readonly FieldEntry[];
  language: string;
};

/**
 * One Hive `custom_json` op: `object_create` then each filled `update_create` in order.
 */
export function buildCreateOps(input: BuildCreateOpsInput) {
  const events: {
    action: 'object_create' | 'update_create';
    v: 1;
    payload: Record<string, unknown>;
  }[] = [
    {
      action: 'object_create',
      v: 1,
      payload: {
        object_id: input.objectId,
        object_type: input.objectType,
        creator: input.creator,
      },
    },
  ];

  for (const entry of input.fields) {
    const locale =
      entry.locale && entry.locale.length > 0 ? entry.locale : input.language;
    const payload = buildUpdateCreateEventPayload(input.objectId, input.creator, {
      ...entry,
      locale,
    });
    if (payload) {
      events.push({
        action: 'update_create',
        v: 1,
        payload,
      });
    }
  }

  const requiredTypes = groupFieldsByPriority(input.objectType).required;
  for (const updateType of requiredTypes) {
    const hasValidEntry = input.fields.some(
      (e) => e.updateType === updateType && isEntryValid(e),
    );
    const hasEvent = events.some(
      (e) =>
        e.action === 'update_create' &&
        (e.payload as { update_type?: string }).update_type === updateType,
    );
    if (!hasValidEntry || !hasEvent) {
      throw new Error(`Required field not ready for publish: ${updateType}`);
    }
  }

  return buildCustomJsonOp({
    required_auths: [],
    required_posting_auths: [input.creator],
    id: input.odlCustomJsonId,
    json: JSON.stringify({ events }),
  });
}
