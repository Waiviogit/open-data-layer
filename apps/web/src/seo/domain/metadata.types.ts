export type ObjectSeoInput = {
  objectId: string;
  title: string;
  description: string | null;
  canonicalUrl: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  objectTypeKey: string;
  jsonLd: Record<string, unknown> | null;
};

export type PostSeoInput = {
  authorName: string;
  permlink: string;
  title: string | null;
  excerpt: string;
  thumbnailUrl: string | null;
  videoThumbnailUrl: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  permalinkPath: string;
};

export type ProfileSeoInput = {
  name: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  reputation: number;
};

export type SeoBuildContext = {
  locale: string;
  messages: Readonly<Record<string, string>>;
};
