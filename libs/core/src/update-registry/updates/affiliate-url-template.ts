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
  /** Must contain $product_id and $affiliate_code placeholders. */
  schema: urlTemplateSchema.refine(
    (v) => v.includes('$product_id') && v.includes('$affiliate_code'),
    {
      message: 'Template must contain $product_id and $affiliate_code',
    },
  ),
};
