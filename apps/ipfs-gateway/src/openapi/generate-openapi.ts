import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import './upload.openapi';
import './files.openapi';
import './content.openapi';
import './namespaces.openapi';

export function generateOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Opden Data Layer — IPFS Gateway',
      version: '1.0.0',
      description: 'Upload images (WebP) and JSON to IPFS; retrieve by CID.',
    },
    servers: [{ url: '/' }],
  });
}
