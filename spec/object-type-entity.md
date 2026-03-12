# Object Type

**Back:** [Spec index](README.md) · **Related:** [vote-semantics](vote-semantics.md), [reject-codes](reject-codes.md)

## 1. Purpose

`ObjectType` is a **code-level construct** — it does not exist as a database entity. Object types are defined as static TypeScript objects inside the indexer/API codebase and describe which update types are valid for objects of a given type, and what suggested values exist for each update.

Adding or changing an object type requires a **pull request** to this repository (see section 5).

## 2. TypeScript interfaces

```typescript
interface SupposedUpdate {
  name: string;
  values: string[] | unknown[];  // unknown[] for JSON-valued updates
  id_path?: string;             
}

interface ObjectType {
  name: string;                  // unique type identifier, e.g. "product", "recipe"
  supportedUpdates: string[];    // update type names accepted for this object type
  supposedUpdates: SupposedUpdate[];  // suggested/autocomplete metadata for tooling
}
```

## 3. Update registry

In addition to per-type definitions, the codebase must maintain a **global update registry** — a flat map of every possible `updateType` name to its validation schema:

```typescript
interface UpdateDefinition {
  name: string;           // update type identifier, e.g. "name", "price", "location"
  valueKind: 'text' | 'geo' | 'json';
  cardinality: 'single' | 'multi';
  schema: ZodSchema;      // runtime validation schema for the value payload
}

const UPDATE_REGISTRY: Record<string, UpdateDefinition> = { ... };
```

The indexer validates every incoming `update_create` against this registry. If the `updateType` is not present in the registry, the event is rejected with `UNSUPPORTED_UPDATE_TYPE`. If the value fails schema validation, it is rejected with `INVALID_UPDATE_VALUE`.

## 4. Indexer validation flow

For every `update_create` event:

1. Look up `updateType` in `UPDATE_REGISTRY`. Reject with `UNSUPPORTED_UPDATE_TYPE` if absent.
2. Resolve the target object's `objectType` from `objects_core`.
3. Look up the matching `ObjectType` in the code registry. If the `objectType` is unknown, accept the update without type-level restriction (open type).
4. If the `ObjectType` is known, verify `updateType ∈ supportedUpdates`. Reject with `UNSUPPORTED_UPDATE_TYPE_FOR_OBJECT` if not listed.
5. Validate the update value against `UPDATE_REGISTRY[updateType].schema`. Reject with `INVALID_UPDATE_VALUE` if invalid.

## 5. Adding a new object type

New object types and update definitions are added exclusively via pull request:

- Add an `ObjectType` entry to the type registry constant.
- Add any new `UpdateDefinition` entries to `UPDATE_REGISTRY` with their Zod schemas.
- Update `supposedUpdates` for UI autocomplete where applicable.
- The PR must include a description of the new type, its intended update set, and example values.

Requirements for the PR process will be described in a separate contribution guide.

## 6. supposedUpdates semantics

`supposedUpdates` defines the **recommended set of updates** that should be pre-populated when creating a new object of this type. It is intended for client tooling — when a user creates a new object, the UI uses `supposedUpdates` to suggest or auto-fill the initial update fields.

- `name` — the `updateType` to suggest (must be present in `supportedUpdates`).
- `values` — recommended default values for that field; `string[]` for text updates, `unknown[]` for JSON-valued updates.
- `id_path` — dot-path to the identity field within a JSON value, used for deduplication when the update is multi-cardinality and JSON-valued (e.g. `"lang"` inside `{ lang: "en", text: "..." }`).

`supposedUpdates` does not affect indexer accept/reject behaviour.
