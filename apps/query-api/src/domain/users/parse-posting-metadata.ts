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
