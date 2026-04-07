import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@hiveio/dhive';

@Injectable()
export class HiveNodeService {
  private readonly logger = new Logger(HiveNodeService.name);
  private readonly client: Client;

  constructor(private readonly config: ConfigService) {
    const nodes = this.config.get<string[]>('hive.rpcNodes') ?? [
      'https://api.hive.blog',
    ];
    this.client = new Client(nodes);
  }

  /**
   * Returns Hive posting public key (STM/... or KSM/...) for the account, or null if missing.
   */
  async getPostingPublicKey(username: string): Promise<string | null> {
    try {
      const accounts = await this.client.database.getAccounts([username]);
      const acc = accounts[0];
      if (!acc?.posting?.key_auths?.length) {
        return null;
      }
      return String(acc.posting.key_auths[0][0]);
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }
}
