import {
  Body,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ReqLocale } from '@opden-data-layer/core';
import {
  GetObjectByIdEndpoint,
  resolveObjectBodySchema,
  type ProjectedObjectWithCounts,
  type ResolveObjectBody,
} from '../domain/objects';
import { ReqGovernanceObjectId } from '../http/governance-object-id.decorator';
import { ReqViewer } from '../http/viewer-header.decorator';
import { ZodBodyPipe } from '../pipes';

@Controller({ path: 'objects', version: ['1', '2'] })
export class ObjectsController {
  constructor(private readonly getObjectById: GetObjectByIdEndpoint) {}

  @Post('resolve')
  async resolve(
    @Body(new ZodBodyPipe(resolveObjectBodySchema)) body: ResolveObjectBody,
    @ReqLocale() locale: string,
    @ReqGovernanceObjectId() governanceObjectIdFromHeader: string | undefined,
    @ReqViewer() viewer: string | undefined,
  ): Promise<ProjectedObjectWithCounts> {
    const view = await this.getObjectById.execute({
      objectId: body.object_id,
      updateTypes: body.update_types,
      locale,
      includeRejected: body.include_rejected,
      governanceObjectIdFromHeader,
      viewerAccount: viewer,
    });
    if (!view) {
      throw new NotFoundException(`Object not found: ${body.object_id}`);
    }
    return view;
  }
}
