import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import './objects.openapi';

export function generateOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Opden Data Layer — Query API',
      version: '1.0.0',
      description: 'Read-side API for resolved object views.',
    },
    servers: [{ url: '/' }],
  });
}
