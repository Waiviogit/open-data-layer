import type { UpdateDefinition } from '../types';
import { urlTemplateSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_URL_TEMPLATE: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_URL_TEMPLATE,
  namespace: 'odl',
  localizable: false,
  description: 'Affiliate URL template or base.',
  value_kind: 'text',
  cardinality: 'single',
  /** Must be https and contain $productId and $affiliateCode placeholders. */
  schema: urlTemplateSchema
    .refine((v) => v.toLowerCase().startsWith('https://'), {
      message: 'Template must start with https://',
    })
    .refine((v) => v.includes('$productId') && v.includes('$affiliateCode'), {
      message: 'Template must contain $productId and $affiliateCode',
    }),
};
