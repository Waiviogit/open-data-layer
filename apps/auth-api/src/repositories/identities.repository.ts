import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { KYSELY_AUTH } from '../database';
import type { AuthDatabase } from '../database/types';
import type { AuthProvider } from '../database/types';

@Injectable()
export class IdentitiesRepository {
  private readonly logger = new Logger(IdentitiesRepository.name);

  constructor(@Inject(KYSELY_AUTH) private readonly db: Kysely<AuthDatabase>) {}

  async upsertIdentity(input: {
    userId: string;
    provider: AuthProvider;
    providerSubject: string;
    metadata?: import('../database/types').JsonValue | null;
  }): Promise<void> {
    const now = new Date();
    try {
      const existing = await this.db
        .selectFrom('auth_identities')
        .where('provider', '=', input.provider)
        .where('provider_subject', '=', input.providerSubject)
        .selectAll()
        .executeTakeFirst();

      if (existing) {
        await this.db
          .updateTable('auth_identities')
          .set({
            last_used_at: now,
            user_id: input.userId,
            metadata_json: input.metadata ?? null,
          })
          .where('id', '=', existing.id)
          .execute();
        return;
      }

      await this.db
        .insertInto('auth_identities')
        .values({
          id: randomUUID(),
          user_id: input.userId,
          provider: input.provider,
          provider_subject: input.providerSubject,
          created_at: now,
          last_used_at: now,
          metadata_json: input.metadata ?? null,
        })
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }
}
