import { z } from 'zod';
import { registry } from './registry';

registry.registerPath({
  method: 'get',
  path: '/content/image/{cid}',
  summary: 'Stream WebP image from IPFS by CID (inline, CDN-cacheable)',
  request: {
    params: z.object({
      cid: z.string().min(1).openapi({ description: 'IPFS CID' }),
    }),
  },
  responses: {
    200: {
      description: 'WebP image bytes',
      content: {
        'image/webp': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
      },
    },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/content/json/{cid}',
  summary: 'Stream JSON from IPFS by CID (inline, CDN-cacheable)',
  request: {
    params: z.object({
      cid: z.string().min(1).openapi({ description: 'IPFS CID' }),
    }),
  },
  responses: {
    200: {
      description: 'JSON document',
      content: {
        'application/json': {
          schema: z.unknown().openapi({ description: 'JSON body' }),
        },
      },
    },
    404: { description: 'Not found' },
  },
});
