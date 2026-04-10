/**
 * Hive `comment` / post `json_metadata` object (serialized to string for the chain).
 * Waivio-style fields; callers supply `host` (browser or request headers).
 */

export type HiveJsonMetadata = {
  readonly host: string;
  readonly community: string;
  readonly app: string;
  readonly format: string;
  readonly timeOfPostCreation: number;
  readonly tags: readonly string[];
  readonly users: readonly unknown[];
  readonly links: readonly unknown[];
  readonly image: readonly unknown[];
};

export type BuildHiveJsonMetadataInput = {
  readonly host: string;
  readonly community: string;
  readonly app: string;
  readonly format?: string;
  readonly timeOfPostCreation?: number;
  readonly tags?: readonly string[];
  readonly users?: readonly unknown[];
  readonly links?: readonly unknown[];
  readonly image?: readonly unknown[];
};

export function buildHiveJsonMetadata(input: BuildHiveJsonMetadataInput): HiveJsonMetadata {
  return {
    host: input.host,
    community: input.community,
    app: input.app,
    format: input.format ?? 'markdown',
    timeOfPostCreation: input.timeOfPostCreation ?? Date.now(),
    tags: input.tags ?? [],
    users: input.users ?? [],
    links: input.links ?? [],
    image: input.image ?? [],
  };
}

export function stringifyHiveJsonMetadata(meta: HiveJsonMetadata): string {
  return JSON.stringify(meta);
}

/** Build + stringify for `comment.json_metadata`. */
export function buildHiveJsonMetadataString(input: BuildHiveJsonMetadataInput): string {
  return stringifyHiveJsonMetadata(buildHiveJsonMetadata(input));
}
