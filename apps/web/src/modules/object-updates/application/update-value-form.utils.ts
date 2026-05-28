import type { UpdateDefinition } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { z } from 'zod';

import { sanitizeGalleryItemFormValue } from './gallery-form-value';
import {
  coerceImageCidOrUrlPrefill,
  isImageCidOrUrlUpdateType,
  sanitizeImageCidOrUrlFormValue,
} from './image-form-value';
import { sanitizeMenuItemFormValue } from './menu-item-form-value';
import { sanitizeWalletAddressFormValue } from './wallet-address-form-value';

export type GeoFormValue = { latitude: string; longitude: string };

export function geoFormValueFromRaw(raw: unknown): GeoFormValue {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      latitude:
        o.latitude === undefined || o.latitude === null ? '' : String(o.latitude),
      longitude:
        o.longitude === undefined || o.longitude === null
          ? ''
          : String(o.longitude),
    };
  }
  return { latitude: '', longitude: '' };
}

export type JsonFieldDescriptor = {
  key: string;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'string_array' | 'json';
  optional: boolean;
  enumValues?: readonly string[];
};

export function unwrapRootStringArraySchema(
  schema: z.ZodType,
): z.ZodArray<z.ZodString> | null {
  let inner: z.ZodType = schema;
  if (inner instanceof z.ZodOptional) {
    inner = inner.unwrap() as z.ZodType;
  }
  if (inner instanceof z.ZodDefault) {
    inner = inner.removeDefault() as z.ZodType;
  }
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodString) {
    return inner as z.ZodArray<z.ZodString>;
  }
  return null;
}

export function initialValueForDefinition(definition: UpdateDefinition): unknown {
  switch (definition.value_kind) {
    case 'text':
    case 'object_ref':
      return '';
    case 'geo':
      return { latitude: '', longitude: '' } satisfies GeoFormValue;
    case 'json': {
      if (unwrapRootStringArraySchema(definition.schema)) {
        return '';
      }
      const fields = getJsonFieldDescriptors(definition.schema);
      if (fields && fields.length > 0) {
        const obj: Record<string, unknown> = {};
        for (const field of fields) {
          if (field.kind === 'boolean') {
            obj[field.key] = false;
          } else if (field.kind === 'number') {
            obj[field.key] = '';
          } else if (field.kind === 'string_array') {
            obj[field.key] = '';
          } else if (field.kind === 'enum' && field.enumValues?.[0]) {
            obj[field.key] = field.enumValues[0];
          } else {
            obj[field.key] = '';
          }
        }
        return obj;
      }
      return '{\n  \n}';
    }
    default:
      return '';
  }
}

export function getJsonFieldDescriptors(
  schema: z.ZodType,
): JsonFieldDescriptor[] | null {
  const objectSchema = unwrapToObject(schema);
  if (!objectSchema) {
    return null;
  }
  const shape = objectSchema.shape;
  return Object.entries(shape).map(([key, fieldSchema]) =>
    describeJsonField(key, fieldSchema as z.ZodType),
  );
}

function unwrapToObject(schema: z.ZodType): z.ZodObject | null {
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  if (schema instanceof z.ZodOptional) {
    return unwrapToObject(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapToObject(schema.removeDefault() as z.ZodType);
  }
  return null;
}

function describeJsonField(key: string, schema: z.ZodType): JsonFieldDescriptor {
  let optional = false;
  let inner = schema;
  if (inner instanceof z.ZodOptional) {
    optional = true;
    inner = inner.unwrap() as z.ZodType;
  }
  if (inner instanceof z.ZodDefault) {
    optional = true;
    inner = inner.removeDefault() as z.ZodType;
  }
  if (inner instanceof z.ZodEnum) {
    return {
      key,
      kind: 'enum',
      optional,
      enumValues: inner.options as readonly string[],
    };
  }
  if (inner instanceof z.ZodBoolean) {
    return { key, kind: 'boolean', optional };
  }
  if (inner instanceof z.ZodNumber) {
    return { key, kind: 'number', optional };
  }
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodString) {
    return { key, kind: 'string_array', optional };
  }
  if (inner instanceof z.ZodObject) {
    return { key, kind: 'json', optional };
  }
  return { key, kind: 'string', optional };
}

export function coerceFormValueForValidation(
  definition: UpdateDefinition,
  raw: unknown,
): unknown {
  if (definition.value_kind === 'text' || definition.value_kind === 'object_ref') {
    return typeof raw === 'string' ? raw : '';
  }
  if (definition.value_kind === 'geo') {
    const g = geoFormValueFromRaw(raw);
    return {
      latitude: g.latitude === '' ? NaN : Number(g.latitude),
      longitude: g.longitude === '' ? NaN : Number(g.longitude),
    };
  }
  if (definition.value_kind === 'json') {
    if (unwrapRootStringArraySchema(definition.schema)) {
      if (Array.isArray(raw)) {
        return raw
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      if (typeof raw === 'string') {
        return raw
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    }
    if (raw && typeof raw === 'object') {
      if (definition.update_type === UPDATE_TYPES.MENU_ITEM) {
        return sanitizeMenuItemFormValue(raw as Record<string, unknown>);
      }
      if (definition.update_type === UPDATE_TYPES.WALLET_ADDRESS) {
        return sanitizeWalletAddressFormValue(raw as Record<string, unknown>);
      }
      if (definition.update_type === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
        return sanitizeGalleryItemFormValue(raw as Record<string, unknown>);
      }
      if (isImageCidOrUrlUpdateType(definition.update_type)) {
        return sanitizeImageCidOrUrlFormValue(raw as Record<string, unknown>);
      }
    }
    const fields = getJsonFieldDescriptors(definition.schema);
    if (fields && fields.length > 0 && raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const field of fields) {
        const v = obj[field.key];
        if (v === '' || v === undefined) {
          if (!field.optional) {
            out[field.key] = field.kind === 'number' ? NaN : '';
          }
          continue;
        }
        if (field.kind === 'number') {
          out[field.key] = Number(v);
        } else if (field.kind === 'boolean') {
          out[field.key] = Boolean(v);
        } else if (field.kind === 'string_array') {
          const lines =
            typeof v === 'string'
              ? v
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
          out[field.key] = lines;
        } else if (field.kind === 'json') {
          out[field.key] =
            typeof v === 'string' ? parseJsonValue(v) : v;
        } else {
          out[field.key] = String(v);
        }
      }
      return out;
    }
    if (typeof raw === 'string') {
      if (isImageCidOrUrlUpdateType(definition.update_type)) {
        return coerceImageCidOrUrlPrefill(raw);
      }
      return parseJsonValue(raw);
    }
    return raw;
  }
  return raw;
}

function parseJsonValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export function validateUpdateValue(
  definition: UpdateDefinition,
  raw: unknown,
): { success: true; value: unknown } | { success: false } {
  const coerced = coerceFormValueForValidation(definition, raw);
  const result = definition.schema.safeParse(coerced);
  if (!result.success) {
    return { success: false };
  }
  return { success: true, value: result.data };
}
