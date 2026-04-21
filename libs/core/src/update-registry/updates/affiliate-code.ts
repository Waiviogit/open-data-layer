import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_CODE: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_CODE,
  namespace: 'odl',
  localizable: false,
  description: 'Affiliate or referral code list.',
  value_kind: 'json',
  cardinality: 'multi',
  /**
   * Array where first element is "PERSONAL" or a domain (e.g. "example.social.gifts")
   * and remaining are codes, optionally with show chance: "CODE1::70", "CODE2::30".
   */
  schema: z.array(z.string().min(1)).min(1),
};
