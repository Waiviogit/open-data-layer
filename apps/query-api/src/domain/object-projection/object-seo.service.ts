import { Injectable } from '@nestjs/common';
import type { ProjectedObject, ProjectedObjectSeo } from './projected-object.types';

@Injectable()
export class ObjectSeoService {
  build(obj: ProjectedObject): ProjectedObjectSeo {
    return {
      title: typeof obj.fields.name === 'string' ? obj.fields.name : null,
      description: typeof obj.fields.description === 'string' ? obj.fields.description : null,
      canonical_url: null,
      json_ld: {},
    };
  }
}
