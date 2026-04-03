import { Injectable } from '@nestjs/common';
import type { AccountCurrent } from '@opden-data-layer/core';
import { AccountsCurrentRepository } from '../../repositories';

export interface UserProfileView {
  name: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  postingCount: number;
  reputation: number;
}

type PostingProfileSlice = {
  name?: string;
  about?: string;
  profile_image?: string;
  cover_image?: string;
};

/**
 * Parses `posting_json_metadata` (Hive posting metadata JSON string).
 * Returns null on empty input or invalid JSON.
 */
export function parsePostingMetadata(
  raw: string | null,
): { profile: PostingProfileSlice } | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const profileUnknown = (parsed as Record<string, unknown>).profile;
    if (typeof profileUnknown !== 'object' || profileUnknown === null) {
      return null;
    }
    const p = profileUnknown as Record<string, unknown>;
    const profile: PostingProfileSlice = {};
    if (typeof p.name === 'string') {
      profile.name = p.name;
    }
    if (typeof p.about === 'string') {
      profile.about = p.about;
    }
    if (typeof p.profile_image === 'string') {
      profile.profile_image = p.profile_image;
    }
    if (typeof p.cover_image === 'string') {
      profile.cover_image = p.cover_image;
    }
    return { profile };
  } catch {
    return null;
  }
}

function mapAccountToView(row: AccountCurrent): UserProfileView {
  const meta = parsePostingMetadata(row.posting_json_metadata);
  const aliasTrimmed = row.alias?.trim() ?? '';
  const metaName = meta?.profile.name?.trim() ?? '';
  const displayName =
    aliasTrimmed !== ''
      ? aliasTrimmed
      : metaName !== ''
        ? metaName
        : row.name;

  const bio = meta?.profile.about ?? '';

  const avatarFromColumn = row.profile_image?.trim() ?? '';
  const avatarFromMeta = meta?.profile.profile_image?.trim() ?? '';
  const avatarUrl =
    avatarFromColumn !== ''
      ? avatarFromColumn
      : avatarFromMeta !== ''
        ? avatarFromMeta
        : null;

  const coverTrimmed = meta?.profile.cover_image?.trim() ?? '';
  const coverImageUrl = coverTrimmed !== '' ? coverTrimmed : null;

  return {
    name: row.name,
    displayName,
    bio,
    avatarUrl,
    coverImageUrl,
    followerCount: row.followers_count,
    followingCount: row.users_following_count,
    postingCount: row.post_count,
    reputation: row.object_reputation,
  };
}

@Injectable()
export class GetUserProfileEndpoint {
  constructor(private readonly accounts: AccountsCurrentRepository) {}

  async execute(accountName: string): Promise<UserProfileView | null> {
    const row = await this.accounts.findByName(accountName);
    if (!row) {
      return null;
    }
    return mapAccountToView(row);
  }
}
