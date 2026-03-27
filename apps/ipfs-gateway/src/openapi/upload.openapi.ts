import { z } from 'zod';
import { UPLOAD_IMAGE_MAX_FILE_BYTES } from '../constants/upload.constants';
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
    `Accepts multipart form field \`file\`. Max upload size is ${UPLOAD_IMAGE_MAX_FILE_BYTES / (1024 * 1024)} MiB per file. ` +
    'Image must be a supported type; server validates with sharp and stores WebP on IPFS.',
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
    413: { description: 'File exceeds maximum size (50 MiB)' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/upload/file',
  summary: 'Stream a large binary file to IPFS',
  description:
    'Accepts raw bytes as `application/octet-stream`. ' +
    'The body is streamed directly to IPFS without buffering in memory — ' +
    'suitable for multi-GB files. ' +
    'Optional `filename` query parameter sets the MFS entry name; ' +
    'defaults to `upload-<timestamp>.bin`.',
  request: {
    query: z.object({
      filename: z
        .string()
        .optional()
        .openapi({ description: 'Desired filename stored in MFS (e.g. video.mp4)' }),
    }),
    body: {
      content: {
        'application/octet-stream': {
          schema: z.any().openapi({ type: 'string', format: 'binary', description: 'Raw file bytes' }),
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
