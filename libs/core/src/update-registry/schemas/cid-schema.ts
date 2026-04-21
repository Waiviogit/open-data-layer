import { z } from 'zod';
import { CID } from 'multiformats/cid';

export const cidSchema = z.string().refine(
  (value) => {
    try {
      CID.parse(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid CID' },
);
