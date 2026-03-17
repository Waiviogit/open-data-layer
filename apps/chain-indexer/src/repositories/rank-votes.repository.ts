import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  RankVote,
  NewRankVote,
  RankVoteUpdate,
} from '@opden-data-layer/core';

@Injectable()
export class RankVotesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByUpdateIdVoterAndContext(
    updateId: string,
    voter: string,
    rankContext: string
  ) {
    return this.db
      .selectFrom('rank_votes')
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .where('rank_context', '=', rankContext)
      .selectAll()
      .executeTakeFirst();
  }

  async find(criteria: Partial<RankVote>) {
    let query = this.db.selectFrom('rank_votes');

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
    if (criteria.rank !== undefined) {
      query = query.where('rank', '=', criteria.rank);
    }
    if (criteria.rank_context !== undefined) {
      query =
        criteria.rank_context === null
          ? query.where('rank_context', 'is', null)
          : query.where('rank_context', '=', criteria.rank_context);
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
    rankContext: string,
    updateWith: RankVoteUpdate
  ) {
    await this.db
      .updateTable('rank_votes')
      .set(updateWith)
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .where('rank_context', '=', rankContext)
      .execute();
  }

  async create(row: NewRankVote) {
    return this.db
      .insertInto('rank_votes')
      .values(row)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(updateId: string, voter: string, rankContext: string) {
    return this.db
      .deleteFrom('rank_votes')
      .where('update_id', '=', updateId)
      .where('voter', '=', voter)
      .where('rank_context', '=', rankContext)
      .returningAll()
      .executeTakeFirst();
  }
}
