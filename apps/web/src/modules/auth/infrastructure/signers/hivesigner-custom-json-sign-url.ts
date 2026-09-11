import { buildHiveSignerSignUrl } from './hivesigner-sign-url';

export type HiveSignerCustomJsonSignParams = {
  required_auths: readonly string[];
  required_posting_auths: readonly string[];
  id: string;
  json: string;
};

/**
 * HiveSigner `/sign/custom_json` expects JSON array query params for auth fields
 * plus `authority=active` for Engine / active-key json.
 */
export function buildHiveSignerCustomJsonSignUrl(
  params: HiveSignerCustomJsonSignParams,
  redirectUri: string,
): string {
  return buildHiveSignerSignUrl(
    'custom_json',
    {
      authority: 'active',
      required_auths: [...params.required_auths],
      required_posting_auths: [...params.required_posting_auths],
      id: params.id,
      json: params.json,
    },
    redirectUri,
  );
}
