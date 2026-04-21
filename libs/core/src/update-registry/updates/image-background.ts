import type { UpdateDefinition } from '../types';
import { imageCidOrUrlJsonSchema } from '../schemas/image-cid-or-url-json';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IMAGE_BACKGROUND: UpdateDefinition = {
  update_type: UPDATE_TYPES.IMAGE_BACKGROUND,
  namespace: 'odl',
  localizable: true,
  description: 'Background or cover image: exactly one of IPFS CID or HTTPS URL.',
  value_kind: 'json',
  cardinality: 'single',
  schema: imageCidOrUrlJsonSchema,
};
