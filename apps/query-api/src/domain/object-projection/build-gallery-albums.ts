import type { ProjectedGalleryAlbum, ProjectedGalleryPhoto } from './projected-object.types';

const DEFAULT_PHOTOS_ALBUM_NAME = 'Photos';

const DEFAULT_AVATAR_RANK_SCORE = 1;

export type BuildGalleryAlbumsInput = {
  imageGallery: unknown;
  imageGalleryItem: unknown;
  avatarUrl: string | null;
};

export type BuildGalleryAlbumsResult = {
  albums: ProjectedGalleryAlbum[];
  previewGallery: ProjectedGalleryPhoto[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readRankScore(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readAlbumNames(imageGallery: unknown): string[] {
  if (!Array.isArray(imageGallery)) {
    return [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of imageGallery) {
    const name = readString(row);
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

type RawGalleryItem = {
  album: string;
  url: string;
  rankScore: number | null;
  updateId?: string;
};

function readGalleryItems(imageGalleryItem: unknown): RawGalleryItem[] {
  if (!Array.isArray(imageGalleryItem)) {
    return [];
  }
  const items: RawGalleryItem[] = [];
  for (const row of imageGalleryItem) {
    if (!isRecord(row)) {
      continue;
    }
    const album = readString(row.album);
    const url = readString(row.url);
    if (!album || !url) {
      continue;
    }
    const updateId = readString(row.update_id) ?? undefined;
    items.push({
      album,
      url,
      rankScore: readRankScore(row.rank_score),
      updateId,
    });
  }
  return items;
}

function toPhoto(
  url: string,
  rankScore: number | null,
  isAvatar = false,
  updateId?: string,
): ProjectedGalleryPhoto {
  return {
    url,
    rankScore,
    isAvatar,
    ...(updateId ? { update_id: updateId } : {}),
  };
}

function sortAlbumItems(items: ProjectedGalleryPhoto[]): ProjectedGalleryPhoto[] {
  const avatars = items.filter((item) => item.isAvatar);
  const rest = items.filter((item) => !item.isAvatar);
  rest.sort((a, b) => {
    const aRank = a.rankScore ?? Number.NEGATIVE_INFINITY;
    const bRank = b.rankScore ?? Number.NEGATIVE_INFINITY;
    return bRank - aRank;
  });
  return [...avatars, ...rest];
}

function dedupeByUrl(items: ProjectedGalleryPhoto[]): ProjectedGalleryPhoto[] {
  const byUrl = new Map<string, ProjectedGalleryPhoto>();
  for (const item of items) {
    const existing = byUrl.get(item.url);
    if (!existing) {
      byUrl.set(item.url, item);
      continue;
    }
    const existingHasUpdateId = Boolean(existing.update_id);
    const itemHasUpdateId = Boolean(item.update_id);
    if (!existingHasUpdateId && itemHasUpdateId) {
      byUrl.set(item.url, item);
      continue;
    }
    if (existing.isAvatar && !item.isAvatar && itemHasUpdateId) {
      byUrl.set(item.url, item);
    }
  }
  return [...byUrl.values()];
}

/**
 * Port of legacy waivio-api `getGallery.js` album formation on projected ODL fields.
 * @see tmp/waivio-api-legacy/utilities/operations/wobject/getGallery.js
 */
export function buildGalleryAlbums(input: BuildGalleryAlbumsInput): BuildGalleryAlbumsResult {
  const albumNames = readAlbumNames(input.imageGallery);
  const albumNameSet = new Set(albumNames);
  const rawItems = readGalleryItems(input.imageGalleryItem);

  const albumsByName = new Map<string, ProjectedGalleryPhoto[]>();
  for (const name of albumNames) {
    albumsByName.set(name, []);
  }

  const orphans: ProjectedGalleryPhoto[] = [];

  for (const item of rawItems) {
    const photo = toPhoto(item.url, item.rankScore, false, item.updateId);
    if (albumNameSet.has(item.album)) {
      albumsByName.get(item.album)!.push(photo);
      continue;
    }
    orphans.push(photo);
  }

  let photosAlbumItems = albumsByName.get(DEFAULT_PHOTOS_ALBUM_NAME);
  if (!photosAlbumItems) {
    photosAlbumItems = [];
    albumsByName.set(DEFAULT_PHOTOS_ALBUM_NAME, photosAlbumItems);
    if (!albumNames.includes(DEFAULT_PHOTOS_ALBUM_NAME)) {
      albumNames.push(DEFAULT_PHOTOS_ALBUM_NAME);
    }
  }

  const avatarUrl = input.avatarUrl?.trim() ?? null;
  if (avatarUrl) {
    photosAlbumItems.unshift(
      toPhoto(avatarUrl, DEFAULT_AVATAR_RANK_SCORE, true),
    );
  }

  photosAlbumItems.push(...orphans);

  const albums: ProjectedGalleryAlbum[] = albumNames.map((name) => {
    const items = sortAlbumItems(dedupeByUrl(albumsByName.get(name) ?? []));
    albumsByName.set(name, items);
    return { name, items };
  });

  const photosAlbum = albums.find((a) => a.name === DEFAULT_PHOTOS_ALBUM_NAME);
  const previewGallery = photosAlbum?.items ?? [];

  return { albums, previewGallery };
}

export function pickAvatarUrlFromProjectedImage(imageField: unknown): string | null {
  if (typeof imageField === 'string') {
    return readString(imageField);
  }
  if (isRecord(imageField)) {
    return readString(imageField.url);
  }
  return null;
}
