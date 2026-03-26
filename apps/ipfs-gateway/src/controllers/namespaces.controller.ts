import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { IpfsClient } from '@opden-data-layer/clients';
import { MFS_NAMESPACE } from '../constants/mfs-namespaces';

const NAMESPACE_TO_MFS: Record<string, string> = {
  images: MFS_NAMESPACE.IMAGES,
  json: MFS_NAMESPACE.JSON,
};

@Controller('namespaces')
export class NamespacesController {
  constructor(private readonly ipfsClient: IpfsClient) {}

  @Get(':namespace/cid')
  async getNamespaceCid(
    @Param('namespace') namespace: string,
  ): Promise<{ namespace: string; cid: string }> {
    const mfsPath = NAMESPACE_TO_MFS[namespace];
    if (!mfsPath) {
      throw new NotFoundException(`Unknown namespace: ${namespace}`);
    }

    const cid = await this.ipfsClient.filesStat(mfsPath);
    return { namespace, cid };
  }
}
