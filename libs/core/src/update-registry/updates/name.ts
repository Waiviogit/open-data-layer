import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_NAME: UpdateDefinition = {
    update_type: UPDATE_TYPES.NAME,
    value_kind: 'text',
    cardinality: 'single',
    schema: z.string().min(1).max(256),
}