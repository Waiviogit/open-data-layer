/**
 * Public env for Hive `json_metadata` defaults (`community`, `app`).
 * Safe to import from Client Components — only `NEXT_PUBLIC_*` keys.
 * Do not add secrets here.
 */

const DEFAULT_COMMUNITY = 'opden';
const DEFAULT_APP = 'opden/1.0.0';

function trimOrEmpty(v: string | undefined): string {
  return v?.trim() ?? '';
}

export function getHiveJsonMetadataDefaults(): { community: string; app: string } {
  const community = trimOrEmpty(process.env.NEXT_PUBLIC_HIVE_JSON_COMMUNITY);
  const app = trimOrEmpty(process.env.NEXT_PUBLIC_HIVE_JSON_APP);
  return {
    community: community === '' ? DEFAULT_COMMUNITY : community,
    app: app === '' ? DEFAULT_APP : app,
  };
}
