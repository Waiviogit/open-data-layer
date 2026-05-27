# Object avatar fallback to parent

When an object has no winning `image` update (avatar), query-api fills `fields.image` from the parent object's image before returning the projection.

This matches legacy Waivio behavior where avatar resolution tried the object's own avatar first, then the parent.

## Rule

1. Resolve the object's own `image` update (locale + governance rules apply as usual).
2. If `fields.image` is empty/null and the object has a valid `parent` update (`object_ref` → parent `object_id`):
   - Load the parent object's winning `image`.
   - Set `fields.image` on the child to that URL.
3. If the object has its own image, the parent image is **not** used.

The web app reads `fields.image` only (`objectFields.image()`). No client-side fallback is required.

## Where it applies

| Projection path | File | Notes |
|-----------------|------|-------|
| Full object (object page, resolve) | `project-object.ts` → `projectObjectCore` | Uses expanded `fields.parent` (`RefSummary`) |
| Shop / discover cards | `SHOP_CARD_UPDATE_TYPES` includes `parent` | Parent ref expanded in same batch |
| Feed chips | `FEED_OBJECT_UPDATE_TYPES` includes `parent` | Same |
| Post linked objects | `POST_LINKED_OBJECT_UPDATE_TYPES` includes `parent` | Same |
| Ref list cards (related / similar / add-on) | `object-ref-expansion.ts` → `expandObjectRefs` | Second pass loads parent `image` when ref has no image |

## Ref-summary second pass

`expandObjectRefs` builds lightweight `RefSummary` rows. Parent is not embedded as a nested ref on the summary output.

When a ref has no `fields.image` but its resolved view includes a valid `parent` update:

1. Collect parent object ids.
2. Batch-load parent objects with `update_types: ['image']` only.
3. Copy parent image URL into `summary.fields.image`.

This extra load runs only for refs missing an image that also have a parent.

## Related

- Update type: `parent` — `libs/core/src/update-registry/updates/parent.ts`
- Avatar field: `image` — `libs/core/src/update-registry/updates/image.ts`
- [Objects resolve](objects-resolve.md)
- [Object ref lists](object-ref-list-endpoints.md)
