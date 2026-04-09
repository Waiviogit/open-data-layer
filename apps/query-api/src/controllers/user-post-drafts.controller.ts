import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  AuthorOwnsAccountGuard,
  JwtAccessGuard,
  normalizeHiveAccount,
} from '../auth';
import {
  UserPostDraftsService,
  bulkDeleteUserPostDraftsBodySchema,
  createUserPostDraftBodySchema,
  type BulkDeleteUserPostDraftsBody,
  type BulkDeleteUserPostDraftsResult,
  type CreateUserPostDraftBody,
  getDraftsQuerySchema,
  type GetDraftsQuery,
  mutateDraftQuerySchema,
  type MutateDraftQuery,
  patchUserPostDraftBodySchema,
  type PatchUserPostDraftBody,
  type UserPostDraftListResponse,
  type UserPostDraftView,
} from '../domain/drafts';
import { ZodBodyPipe } from '../pipes/zod-body.pipe';
import { ZodQueryPipe } from '../pipes/zod-query.pipe';

@Controller({ path: 'users/:author/drafts', version: '1' })
@UseGuards(JwtAccessGuard, AuthorOwnsAccountGuard)
export class UserPostDraftsController {
  constructor(private readonly drafts: UserPostDraftsService) {}

  @Get()
  async get(
    @Param('author') authorParam: string,
    @Query(new ZodQueryPipe(getDraftsQuerySchema)) query: GetDraftsQuery,
  ): Promise<UserPostDraftView | UserPostDraftListResponse> {
    const author = normalizeHiveAccount(authorParam);
    if (query.draftId || query.permlink) {
      return this.drafts.getOne(author, query.draftId, query.permlink);
    }
    return this.drafts.getList(author, query);
  }

  @Post()
  async create(
    @Param('author') authorParam: string,
    @Body(new ZodBodyPipe(createUserPostDraftBodySchema)) body: CreateUserPostDraftBody,
  ): Promise<UserPostDraftView> {
    const author = normalizeHiveAccount(authorParam);
    return this.drafts.create(author, body);
  }

  @Post('bulk-delete')
  async bulkDelete(
    @Param('author') authorParam: string,
    @Body(new ZodBodyPipe(bulkDeleteUserPostDraftsBodySchema))
    body: BulkDeleteUserPostDraftsBody,
  ): Promise<BulkDeleteUserPostDraftsResult> {
    const author = normalizeHiveAccount(authorParam);
    return this.drafts.deleteMany(author, body);
  }

  @Patch()
  async patch(
    @Param('author') authorParam: string,
    @Query(new ZodQueryPipe(mutateDraftQuerySchema)) query: MutateDraftQuery,
    @Body(new ZodBodyPipe(patchUserPostDraftBodySchema)) body: PatchUserPostDraftBody,
  ): Promise<UserPostDraftView> {
    const author = normalizeHiveAccount(authorParam);
    return this.drafts.patch(author, query.draftId, query.permlink, body);
  }

  @Put()
  async put(
    @Param('author') authorParam: string,
    @Query(new ZodQueryPipe(mutateDraftQuerySchema)) query: MutateDraftQuery,
    @Body(new ZodBodyPipe(patchUserPostDraftBodySchema)) body: PatchUserPostDraftBody,
  ): Promise<UserPostDraftView> {
    const author = normalizeHiveAccount(authorParam);
    return this.drafts.patch(author, query.draftId, query.permlink, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('author') authorParam: string,
    @Query(new ZodQueryPipe(mutateDraftQuerySchema)) query: MutateDraftQuery,
  ): Promise<void> {
    const author = normalizeHiveAccount(authorParam);
    return this.drafts.delete(author, query.draftId, query.permlink);
  }
}
