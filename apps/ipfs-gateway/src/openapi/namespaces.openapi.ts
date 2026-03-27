import { z } from 'zod';
import { registry } from './registry';

const namespaceParamSchema = z.enum(['images', 'files']);

const namespaceCidResponseSchema = registry.register(
  'NamespaceCidResponse',
  z.object({
    namespace: z.string().openapi({ description: 'Namespace key (images or files)' }),
    cid: z
      .string()
      .openapi({ description: 'CID of the MFS directory for bulk pinning' }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/namespaces/{namespace}/cid',
  summary: 'Get MFS directory CID for a namespace',
  description:
    'Returns the current IPFS CID of the `/images` or `/files` MFS directory so other nodes can `pin/add` recursively.',
  request: {
    params: z.object({
      namespace: namespaceParamSchema.openapi({
        description: 'Namespace: images or files',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Directory CID for the namespace',
      content: {
        'application/json': { schema: namespaceCidResponseSchema },
      },
    },
    404: { description: 'Unknown namespace' },
  },
});
