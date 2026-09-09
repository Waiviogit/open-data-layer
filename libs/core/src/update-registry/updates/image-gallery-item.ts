import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { cidSchema } from '../schemas/cid-schema';
import { labelSchema, urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/**
 * Single object schema (not `.and()`): Zod 4 intersections do not enforce the
 * image half, so album-only payloads incorrectly passed validation.
 */
export const imageGalleryItemJsonSchema = z
  .object({
    album: labelSchema,
    cid: cidSchema.optional(),
    url: urlStringSchema.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.cid) !== Boolean(v.url), {
    message: 'Exactly one of cid or url must be set',
  });

export const UPDATE_IMAGE_GALLERY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  namespace: 'odl',
  localizable: false,
  description: 'Gallery album id plus exactly one of IPFS CID or HTTPS URL.',
  value_kind: 'json',
  cardinality: 'multi',
  rank_aggregation: 'winner',
  schema: imageGalleryItemJsonSchema,
};
