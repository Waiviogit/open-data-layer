import {
  Body,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import {
  GetObjectByIdEndpoint,
  resolveObjectBodySchema,
  type ResolveObjectBody,
} from '../domain/objects';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ZodBodyPipe } from '../pipes';

@Controller({ path: 'objects', version: ['1', '2'] })
export class ObjectsController {
  constructor(private readonly getObjectById: GetObjectByIdEndpoint) {}

  @Post('resolve')
  async resolve(
    @Body(new ZodBodyPipe(resolveObjectBodySchema)) body: ResolveObjectBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
  ): Promise<ResolvedObjectView> {
    const view = await this.getObjectById.execute({
      objectId: body.object_id,
      updateTypes: body.update_types,
      locale,
      includeRejected: body.include_rejected,
      governanceObjectIdFromHeader,
    });
    if (!view) {
      throw new NotFoundException(`Object not found: ${body.object_id}`);
    }
    return view;
  }
}
