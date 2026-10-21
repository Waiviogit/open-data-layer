import type { UpdateDefinition } from '../types';
import { imageCidOrUrlJsonSchema } from '../schemas/image-cid-or-url-json';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_BUTTON: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
  namespace: 'odl',
  localizable: false,
  description: 'Affiliate button image: exactly one of IPFS CID or HTTPS URL.',
  value_kind: 'json',
  cardinality: 'single',
  schema: imageCidOrUrlJsonSchema,
};
