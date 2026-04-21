import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { imageCidOrUrlJsonSchema } from '../schemas/image-cid-or-url-json';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE_GALLERY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  namespace: 'odl',
  localizable: false,
  description: 'Gallery album id plus exactly one of IPFS CID or HTTPS URL.',
  value_kind: 'json',
  cardinality: 'multi',
  rank_aggregation: 'winner',
  schema: z.object({ album: z.string().min(1) }).strict().and(imageCidOrUrlJsonSchema),
};
