import { z } from 'zod';
import { registry } from './registry';

registry.registerPath({
  method: 'get',
  path: '/files/{cid}',
  summary: 'Stream file from IPFS by CID',
  request: {
    params: z.object({
      cid: z.string().min(1).openapi({ description: 'IPFS CID' }),
    }),
  },
  responses: {
    200: {
      description: 'Raw bytes from IPFS',
      content: {
        'application/octet-stream': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
      },
    },
    404: { description: 'Not found' },
  },
});
