import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ValidityVote,
  NewValidityVote,
  ValidityVoteUpdate,
} from '@opden-data-layer/core';

@Injectable()
export class ValidityVotesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByUpdateIdAndVoter(updateId: string, voter: string) {
    return this.db
      .selectFrom('validity_votes')
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .selectAll()
      .executeTakeFirst();
  }

  async find(criteria: Partial<ValidityVote>) {
    let query = this.db.selectFrom('validity_votes');

    if (criteria.update_id !== undefined) {
      query =
        criteria.update_id === null
          ? query.where('update_id', 'is', null)
          : query.where('update_id', '=', criteria.update_id);
    }
    if (criteria.object_id !== undefined) {
      query =
        criteria.object_id === null
          ? query.where('object_id', 'is', null)
          : query.where('object_id', '=', criteria.object_id);
    }
    if (criteria.voter !== undefined) {
      query =
        criteria.voter === null
          ? query.where('voter', 'is', null)
          : query.where('voter', '=', criteria.voter);
    }
    if (criteria.vote !== undefined) {
      query = query.where('vote', '=', criteria.vote);
    }
    if (criteria.event_seq !== undefined) {
      query = query.where('event_seq', '=', criteria.event_seq);
    }
    if (criteria.transaction_id !== undefined) {
      query =
        criteria.transaction_id === null
          ? query.where('transaction_id', 'is', null)
          : query.where('transaction_id', '=', criteria.transaction_id);
    }

    return query.selectAll().execute();
  }

  async update(
    updateId: string,
    voter: string,
    updateWith: ValidityVoteUpdate
  ) {
    await this.db
      .updateTable('validity_votes')
      .set(updateWith)
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .execute();
  }

  async create(row: NewValidityVote) {
    return this.db
      .insertInto('validity_votes')
      .values(row)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(updateId: string, voter: string) {
    return this.db
      .deleteFrom('validity_votes')
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .returningAll()
      .executeTakeFirst();
  }
}
