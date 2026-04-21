import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_NAME: UpdateDefinition = {
    update_type: UPDATE_TYPES.NAME,
    semantic_key: 'name',
    namespace: 'schema',
    localizable: true,
    description: 'Display or canonical name for the object.',
    value_kind: 'text',
    cardinality: 'single',
    schema: z.string().min(1).max(256),
}