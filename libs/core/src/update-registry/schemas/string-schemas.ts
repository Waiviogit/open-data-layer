import { z } from 'zod';
import { UPDATE_ARRAY_MAX, UPDATE_STRING_MAX } from '../string-limits';

export const hiveAccountNameSchema = z
  .string()
  .min(3)
  .max(UPDATE_STRING_MAX.HIVE_ACCOUNT);

export const objectIdSchema = z.string().min(3).max(UPDATE_STRING_MAX.OBJECT_ID);

export const labelSchema = z.string().min(1).max(UPDATE_STRING_MAX.LABEL);

export const nameSchema = z.string().min(1).max(UPDATE_STRING_MAX.NAME);

export const titleSchema = z.string().min(1).max(UPDATE_STRING_MAX.TITLE);

export const descriptionSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.DESCRIPTION);

export const bodySchema = z.string().min(1).max(UPDATE_STRING_MAX.BODY);

export const urlStringSchema = z.string().url().max(UPDATE_STRING_MAX.URL);

export const urlOrCidStringSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.CID);

export const emailSchema = z.string().email().max(UPDATE_STRING_MAX.EMAIL);

export const phoneSchema = z.string().min(1).max(UPDATE_STRING_MAX.PHONE);

export const shortTokenSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.SHORT_TOKEN);

export const currencySchema = z
  .string()
  .min(2)
  .max(UPDATE_STRING_MAX.PRICE_MODEL_CURRENCY);

export const compatibilitySchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.COMPATIBILITY);

export const urlTemplateSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.URL);

export const affiliateProductIdTypeSchema = z
  .string()
  .toLowerCase()
  .pipe(labelSchema);

export const mediumTextSchema = z.string().min(1).max(UPDATE_STRING_MAX.MEDIUM);

export const numericStringSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a numeric string')
  .max(UPDATE_STRING_MAX.NUMERIC);

export const dateStringSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.DATE);

export const postalCodeSchema = z
  .string()
  .min(1)
  .max(UPDATE_STRING_MAX.POSTAL_CODE);

export const hiveAccountNameArraySchema = z
  .array(hiveAccountNameSchema)
  .max(UPDATE_ARRAY_MAX.GROUP_ACCOUNT_LIST);

export const objectIdArraySchema = z
  .array(objectIdSchema)
  .max(UPDATE_ARRAY_MAX.SORT_CUSTOM_LIST);

export const labelArraySchema = (max: number) =>
  z.array(labelSchema).max(max);

export const shortTokenArraySchema = (max: number) =>
  z.array(shortTokenSchema).max(max);

export const newsFilterStringSchema = labelSchema;

export const newsFilterStringArraySchema = z
  .array(newsFilterStringSchema)
  .max(UPDATE_ARRAY_MAX.NEWS_LIST);

export const newsFilterNestedStringArraySchema = z
  .array(newsFilterStringArraySchema)
  .max(UPDATE_ARRAY_MAX.NEWS_NESTED_LIST);
