/** HiveSigner app account (legacy Waivio production app). */
export const DEFAULT_HIVESIGNER_APP_NAME = 'www.waivio.com';

export const DEFAULT_HIVESIGNER_SCOPE =
  'login,vote,comment,delete_comment,custom_json,follow,reblog,claim_reward_balance,transfer,transfer_to_vesting,withdraw_vesting,account_update,account_update2,convert,limit_order_create,limit_order_cancel';

/** Local `nx serve` — web on :3000, BFF callback route. */
export const DEFAULT_HIVESIGNER_CALLBACK_URL =
  'http://localhost:3000/api/auth/callback/hivesigner';

export const DEFAULT_AUTH_APP_DISPLAY_ORIGIN = 'http://localhost:3000';

export const DEFAULT_HIVESIGNER_API_URL = 'https://hivesigner.com';

/** Docker stack — public HTTPS callback via nginx `DOMAIN`. */
export function buildHivesignerCallbackUrlForDomain(domain: string): string {
  const host = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}/api/auth/callback/hivesigner`;
}

export function buildAuthAppDisplayOriginForDomain(domain: string): string {
  const host = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}`;
}
