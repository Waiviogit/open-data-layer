import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';

import { DEFAULT_DISCOVER_OBJECT_TYPE } from './discover-registry';

export type ResolveInitialDiscoverTypeInput = {
  objectType: string | null;
  usersMode: boolean;
  remembered: string | null;
};

export type ResolveInitialDiscoverTypeResult =
  | { action: 'navigate'; type: string }
  | { action: 'none' };

function isValidRegistryObjectType(type: string): boolean {
  return type in OBJECT_TYPE_REGISTRY;
}

/** Decide how to handle bare `/discover` (no type, not users mode). */
export function resolveInitialDiscoverType(
  input: ResolveInitialDiscoverTypeInput,
): ResolveInitialDiscoverTypeResult {
  if (input.usersMode || input.objectType != null) {
    return { action: 'none' };
  }

  const remembered = input.remembered?.trim();
  if (remembered && isValidRegistryObjectType(remembered)) {
    return { action: 'navigate', type: remembered };
  }

  return { action: 'navigate', type: DEFAULT_DISCOVER_OBJECT_TYPE };
}
