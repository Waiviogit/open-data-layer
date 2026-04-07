import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { AuthDatabase } from './types';

export const KYSELY_AUTH = Symbol('KYSELY_AUTH');

@Global()
@Module({
  providers: [
    {
      provide: KYSELY_AUTH,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const postgres = config.get<{
          host: string;
          port: number;
          database: string;
          user: string;
          password?: string;
          poolMax: number;
        }>('postgres');
        if (!postgres) {
          throw new Error('Database module: postgres config is missing');
        }
        const dialect = new PostgresDialect({
          pool: new Pool({
            host: postgres.host,
            port: postgres.port,
            database: postgres.database,
            user: postgres.user,
            password: postgres.password,
            max: postgres.poolMax,
          }),
        });
        return new Kysely<AuthDatabase>({ dialect });
      },
    },
  ],
  exports: [KYSELY_AUTH],
})
export class DatabaseModule {}
