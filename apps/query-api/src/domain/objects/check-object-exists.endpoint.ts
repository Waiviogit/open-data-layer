import { Injectable } from '@nestjs/common';
import { ObjectsCoreRepository } from '../../repositories';

@Injectable()
export class CheckObjectExistsEndpoint {
  constructor(private readonly objectsCore: ObjectsCoreRepository) {}

  async execute(objectId: string): Promise<boolean> {
    const row = await this.objectsCore.findByObjectId(objectId);
    return row != null;
  }
}
