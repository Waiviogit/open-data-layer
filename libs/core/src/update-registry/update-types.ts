/**
 * String constants for every registered update_type.
 * Use these instead of raw strings when referencing update types in code.
 * @see spec/object-type-entity.md §3
 */
export const UPDATE_TYPES = {
  NAME: 'name',
} as const;

export type UpdateType = (typeof UPDATE_TYPES)[keyof typeof UPDATE_TYPES];
