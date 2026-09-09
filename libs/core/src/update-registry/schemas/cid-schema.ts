import { z } from 'zod';
import { UPDATE_STRING_MAX } from '../string-limits';

/**
 * IPFS-style CID: non-empty string. Strict multibase parsing (e.g. via `multiformats`)
 * is not applied here so tooling like `tsx` and legacy importers are not tied to
 * ESM `multiformats` subpath resolution; add stricter rules when the stack allows.
 */
export const cidSchema = z
  .string()
  .min(1, { message: 'Invalid CID' })
  .max(UPDATE_STRING_MAX.CID, { message: 'Invalid CID' });
