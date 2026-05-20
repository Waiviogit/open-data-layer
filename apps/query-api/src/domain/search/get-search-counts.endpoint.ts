import { Injectable } from '@nestjs/common';
import { SearchRepository } from '../../repositories';
import type { SearchCountsResponseDto } from './search-counts.types';

export interface GetSearchCountsInput {
  q: string;
}

@Injectable()
export class GetSearchCountsEndpoint {
  constructor(private readonly searchRepo: SearchRepository) {}

  async execute(input: GetSearchCountsInput): Promise<SearchCountsResponseDto> {
    const [type_counts, total_users] = await Promise.all([
      this.searchRepo.countObjectsByType(input.q),
      this.searchRepo.countUsers(input.q),
    ]);
    return { type_counts, total_users };
  }
}
