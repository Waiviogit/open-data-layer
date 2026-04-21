import type { ZodType } from 'zod';

/**
 * Defines a single registerable update type.
 * Cardinality and value_kind live here (not in the DB) — they are resolved
 * at query time by the Query Service via UPDATE_REGISTRY lookup.
 * @see docs/spec/object-type-entity.md §3
 */
export interface UpdateDefinition {
  /** Unique update type identifier, e.g. "name", "price", "location". */
  update_type: string;
  /** Short purpose statement for spec/tooling. */
  description: string;
  /** Which value column holds the data for this update type. */
  value_kind: 'text' | 'geo' | 'json' | 'object_ref';
  /**
   * How the resolved view treats multiple rows for the same (object_id, update_type):
   *   - 'single' — pick one winning value (highest-precedence valid update).
   *   - 'multi'  — return all valid values, ordered by ranking.
   */
  cardinality: 'single' | 'multi';
  /** Stable semantic id for tooling / i18n when it differs from `update_type`. */
  semantic_key?: string;
  /** Where this update type is defined (schema vs ODL). */
  namespace?: 'schema' | 'odl';
  /** Whether the value is intended for localization. */
  localizable?: boolean;
  /** Runtime Zod schema used by the Indexer to validate the value payload on insert. */
  schema: ZodType;
}

/**
 * Global flat map of every supported update type name to its definition.
 * Looked up by the Indexer on every `update_create` event.
 * @see docs/spec/object-type-entity.md §3
 */
export type UpdateRegistry = Record<string, UpdateDefinition>;
