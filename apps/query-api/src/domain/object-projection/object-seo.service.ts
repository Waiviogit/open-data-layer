import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProjectedObject, ProjectedObjectSeo } from './projected-object.types';
import { buildObjectCanonicalUrl } from './build-object-canonical-url';

@Injectable()
export class ObjectSeoService {
  constructor(private readonly config: ConfigService) {}

  /**
   * @param viewCanonical - `ResolvedObjectView.canonical` (from `objects_core` / aggregate).
   */
  build(
    obj: ProjectedObject,
    viewCanonical: string | null,
  ): ProjectedObjectSeo {
    const fallbackOrigin = this.config.get<string>(
      'siteCanonical.fallbackOrigin',
      'https://example.com',
    );
    return {
      title: typeof obj.fields.name === 'string' ? obj.fields.name : null,
      description:
        typeof obj.fields.description === 'string' ? obj.fields.description : null,
      canonical_url: buildObjectCanonicalUrl(
        viewCanonical,
        obj.object_id,
        fallbackOrigin,
      ),
      json_ld: {},
    };
  }
}
