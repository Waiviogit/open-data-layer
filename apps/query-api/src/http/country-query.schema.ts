import { z } from 'zod';

export const countryQueryField = z
  .string()
  .trim()
  .max(32)
  .optional()
  .describe('ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid');
