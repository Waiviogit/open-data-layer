import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import './objects.openapi';
import './users.openapi';
import './feed.openapi';
import './user-post-drafts.openapi';

export function generateOpenApiDocument() {
  const base = new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Opden Data Layer — Query API',
      version: '1.0.0',
      description:
        'Read-side API: resolved object views, user profile reads, and authenticated post drafts.',
    },
    servers: [{ url: '/' }],
  });
  return {
    ...base,
    components: {
      ...base.components,
      securitySchemes: {
        ...base.components?.securitySchemes,
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Access token from auth-api (`typ: access`). Same `JWT_SECRET` as auth-api.',
        },
      },
    },
  };
}
