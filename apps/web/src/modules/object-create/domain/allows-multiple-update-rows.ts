import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

/** Whether the create editor may add more than one row for this update type. */
export function allowsMultipleUpdateRows(updateType: string): boolean {
  return UPDATE_REGISTRY[updateType]?.cardinality === 'multi';
}
