import type { AffiliateConfig } from '../affiliate/affiliate.types';
import { pickAffiliateCode } from '../affiliate/pick-affiliate-code';
import { INSTACART_PRODUCT_ID_TYPE } from './instacart.constants';

export function pickInstacartAffiliateCode(configs: AffiliateConfig[]): string | null {
  for (const config of configs) {
    const templateMatch = config.urlTemplate.toLowerCase().includes(INSTACART_PRODUCT_ID_TYPE);
    const typeMatch = config.productIdTypes.some(
      (type) => type.toLowerCase() === INSTACART_PRODUCT_ID_TYPE,
    );
    if (!templateMatch && !typeMatch) {
      continue;
    }
    const code = pickAffiliateCode(config.codes.flatMap((entry) => entry.codes));
    if (code) {
      return code;
    }
  }
  return null;
}
