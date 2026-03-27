import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CONTENT_DISPOSITION_INLINE,
  IMMUTABLE_CACHE_CONTROL,
  MIME_IMAGE_WEBP,
  MIME_JSON_UTF8,
} from '../constants/content-http';
import { GatewayReadService } from '../domain/gateway-read.service';

@Controller('content')
export class ContentController {
  constructor(private readonly gatewayRead: GatewayReadService) {}

  @Get('image/:cid')
  async getImage(
    @Param('cid') cid: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!cid?.trim()) {
      throw new NotFoundException();
    }
    const stream = await this.gatewayRead.readFile(cid.trim());
    res.setHeader('Content-Type', MIME_IMAGE_WEBP);
    res.setHeader('Content-Disposition', CONTENT_DISPOSITION_INLINE);
    res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL);
    return new StreamableFile(stream);
  }

  @Get('json/:cid')
  async getJson(
    @Param('cid') cid: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!cid?.trim()) {
      throw new NotFoundException();
    }
    const stream = await this.gatewayRead.readFile(cid.trim());
    res.setHeader('Content-Type', MIME_JSON_UTF8);
    res.setHeader('Content-Disposition', CONTENT_DISPOSITION_INLINE);
    res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL);
    return new StreamableFile(stream);
  }
}
