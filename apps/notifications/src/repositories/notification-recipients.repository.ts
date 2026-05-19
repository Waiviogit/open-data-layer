import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OdlDatabase } from '@opden-data-layer/core';
import type { Kysely } from 'kysely';
import { KYSELY } from '../database';

@Injectable()
export class NotificationRecipientsRepository {
  private readonly logger = new Logger(NotificationRecipientsRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<OdlDatabase>) {}

  async findObjectCreator(objectId: string): Promise<string | null> {
    try {
      const row = await this.db
        .selectFrom('objects_core')
        .select('creator')
        .where('object_id', '=', objectId)
        .executeTakeFirst();
      return row?.creator ?? null;
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async findAdministrativeAuthorities(objectId: string): Promise<string[]> {
    try {
      const rows = await this.db
        .selectFrom('object_authority')
        .select('account')
        .where('object_id', '=', objectId)
        .where('authority_type', '=', 'administrative')
        .execute();
      return rows.map((r) => r.account);
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async findBellFollowers(objectId: string): Promise<string[]> {
    try {
      const rows = await this.db
        .selectFrom('user_object_follows')
        .select('account')
        .where('object_id', '=', objectId)
        .where('bell', '=', true)
        .execute();
      return rows.map((r) => r.account);
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }
}
