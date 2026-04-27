import { z } from 'zod';

/**
 * IPFS-style CID: non-empty string. Strict multibase parsing (e.g. via `multiformats`)
 * is not applied here so tooling like `tsx` and legacy importers are not tied to
 * ESM `multiformats` subpath resolution; add stricter rules when the stack allows.
 */
export const cidSchema = z
  .string()
  .min(1, { message: 'Invalid CID' })
  .max(2048, { message: 'Invalid CID' });
