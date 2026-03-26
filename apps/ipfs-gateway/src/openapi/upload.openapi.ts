import { z } from 'zod';
import { registry } from './registry';

const ipfsUploadResultSchema = registry.register(
  'IpfsUploadResult',
  z.object({
    cid: z.string().openapi({ description: 'IPFS content identifier (CID)' }),
    url: z.string().optional().openapi({
      description: 'Public gateway URL when IPFS_GATEWAY_URL is configured',
    }),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/upload/image',
  summary: 'Upload image (converted to WebP) to IPFS',
  description:
    'Accepts multipart form field `file`. Image must be a supported type; server validates with sharp and stores WebP on IPFS.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().openapi({
              type: 'string',
              format: 'binary',
              description: 'Image file',
            }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Stored on IPFS',
      content: { 'application/json': { schema: ipfsUploadResultSchema } },
    },
    400: { description: 'Invalid or missing file' },
  },
});

const jsonBodySchema = registry.register(
  'JsonUploadBody',
  z.unknown().openapi({ description: 'Any JSON value to pin on IPFS' }),
);

registry.registerPath({
  method: 'post',
  path: '/upload/json',
  summary: 'Upload JSON payload to IPFS',
  request: {
    body: {
      content: {
        'application/json': {
          schema: jsonBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Stored on IPFS',
      content: { 'application/json': { schema: ipfsUploadResultSchema } },
    },
  },
});
