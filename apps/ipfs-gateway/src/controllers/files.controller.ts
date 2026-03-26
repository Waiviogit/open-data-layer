import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { GatewayReadService } from '../domain/gateway-read.service';

@Controller('files')
export class FilesController {
  constructor(private readonly gatewayRead: GatewayReadService) {}

  @Get(':cid')
  async getFile(
    @Param('cid') cid: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!cid?.trim()) {
      throw new NotFoundException();
    }
    const stream = await this.gatewayRead.readFile(cid.trim());
    res.setHeader('Content-Type', 'application/octet-stream');
    return new StreamableFile(stream);
  }
}
