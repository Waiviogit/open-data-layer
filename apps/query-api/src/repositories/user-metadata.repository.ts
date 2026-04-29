import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

export type UserShopVisibilityFlags = {
  hide_linked_objects: boolean;
  hide_recipe_objects: boolean;
};

@Injectable()
export class UserMetadataRepository {
  private readonly logger = new Logger(UserMetadataRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Visibility flags for shop/recipe feeds. When no row exists, linked posts are visible (both false).
   */
  async findShopVisibilityFlags(account: string): Promise<UserShopVisibilityFlags> {
    const trimmed = account.trim();
    if (trimmed.length === 0) {
      return { hide_linked_objects: false, hide_recipe_objects: false };
    }
    try {
      const row = await this.db
        .selectFrom('user_metadata')
        .select(['hide_linked_objects', 'hide_recipe_objects'])
        .where('account', '=', trimmed)
        .executeTakeFirst();
      if (!row) {
        return { hide_linked_objects: false, hide_recipe_objects: false };
      }
      return {
        hide_linked_objects: row.hide_linked_objects,
        hide_recipe_objects: row.hide_recipe_objects,
      };
    } catch (error) {
      this.logger.error(
        `findShopVisibilityFlags failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { hide_linked_objects: false, hide_recipe_objects: false };
    }
  }
}
