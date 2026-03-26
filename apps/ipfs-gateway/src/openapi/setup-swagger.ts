import type { INestApplication } from '@nestjs/common';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { generateOpenApiDocument } from './generate-openapi';

export function setupSwagger(app: INestApplication): void {
  const document = generateOpenApiDocument() as unknown as OpenAPIObject;
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
  });
}
