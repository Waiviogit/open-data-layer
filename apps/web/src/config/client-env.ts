/**
 * Public (NEXT_PUBLIC_*) env vars for use in Client Components.
 * Dev: ws://localhost:7200/notifications (direct to service)
 * Prod: wss://<DOMAIN>/notifications (via nginx)
 * Empty string = WS disabled; feature degrades to timeout-only.
 */
export const NOTIFICATIONS_WS_URL = (
  process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_URL ?? ''
).trim();

export { ODL_NETWORK, ODL_CUSTOM_JSON_ID } from './odl-network-public';
