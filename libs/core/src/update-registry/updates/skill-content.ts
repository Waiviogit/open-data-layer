import type { UpdateDefinition } from '../types';
import { bodySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SKILL_CONTENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.SKILL_CONTENT,
  namespace: 'odl',
  localizable: true,
  description: 'Skill body (markdown instructions).',
  value_kind: 'text',
  cardinality: 'single',
  schema: bodySchema,
};
