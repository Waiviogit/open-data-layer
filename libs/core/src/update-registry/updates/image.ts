import type { UpdateDefinition } from '../types';
import { imageCidOrUrlJsonSchema } from '../schemas/image-cid-or-url-json';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE,
  semantic_key: 'image',
  namespace: 'schema',
  localizable: true,
  description: 'Avatar or profile image: exactly one of IPFS CID or HTTPS URL.',
  value_kind: 'json',
  cardinality: 'single',
  schema: imageCidOrUrlJsonSchema,
};
