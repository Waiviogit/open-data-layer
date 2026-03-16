# Object Type

**Back:** [Spec index](README.md) · **Related:** [vote-semantics](vote-semantics.md), [reject-codes](reject-codes.md)

## 1. Purpose

`ObjectType` is a **code-level construct** — it does not exist as a database entity. Object types are defined as static TypeScript objects inside the indexer/API codebase and describe which update types are valid for objects of a given type, and what suggested values exist for each update.

Adding or changing an object type requires a **pull request** to this repository (see section 5).

## 2. TypeScript interfaces

```typescript
interface SupposedUpdate {
  update_type: string;
  values: string[] | unknown[];  // unknown[] for JSON-valued updates
  id_path?: string;             
}

interface ObjectType {
  object_type: string;                  // unique type identifier, e.g. "product", "recipe"
  supported_updates: string[];    // update type names accepted for this object type
  supposed_updates: SupposedUpdate[];  // suggested/autocomplete metadata for tooling
}
```

## 3. Update registry

In addition to per-type definitions, the codebase must maintain a **global update registry** — a flat map of every possible `updateType` name to its validation schema:

```typescript
interface UpdateDefinition {
  update_type: string;           // update type identifier, e.g. "name", "price", "location"
  value_kind: 'text' | 'geo' | 'json';
  cardinality: 'single' | 'multi';
  schema: ZodSchema;      // runtime validation schema for the value payload
}

const UPDATE_REGISTRY: Record<string, UpdateDefinition> = { ... };
```

The indexer validates every incoming `update_create` against this registry. If the `updateType` is not present in the registry, the event is rejected with `UNSUPPORTED_UPDATE_TYPE`. If the value fails schema validation, it is rejected with `INVALID_UPDATE_VALUE`.

## 4. Indexer validation flow

For every `update_create` event:

1. Look up `update_type` in `UPDATE_REGISTRY`. Reject with `UNSUPPORTED_UPDATE_TYPE` if absent.
2. Resolve the target object's `object_type` from `objects_core`.
3. Look up the matching `object_type` in the code registry. If the `object_type` is unknown, Reject with `UNSUPPORTED_UPDATE_TYPE_FOR_OBJECT`.
4. If the `object_type` is known, verify `updateType ∈ supportedUpdates`. Reject with `UNSUPPORTED_UPDATE_TYPE_FOR_OBJECT` if not listed.
5. Validate the update value against `UPDATE_REGISTRY[update_type].schema`. Reject with `INVALID_UPDATE_VALUE` if invalid.

## 5. Adding a new object type

New object types and update definitions are added exclusively via pull request:

- Add an `ObjectType` entry to the type registry constant.
- Add any new `UpdateDefinition` entries to `UPDATE_REGISTRY` with their Zod schemas.
- Update `supposed_updates` for UI autocomplete where applicable.
- The PR must include a description of the new type, its intended update set, and example values.

Requirements for the PR process will be described in a separate contribution guide.

## 6. supposedUpdates semantics

`supposed_updates` defines the **recommended set of updates** that should be pre-populated when creating a new object of this type. It is intended for client tooling — when a user creates a new object, the UI uses `supposedUpdates` to suggest or auto-fill the initial update fields.

- `update_type` — the `updateType` to suggest (must be present in `supported_updates`).
- `values` — recommended default values for that field; `string[]` for text updates, `unknown[]` for JSON-valued updates.

`supposed_updates` does not affect indexer accept/reject behaviour.
