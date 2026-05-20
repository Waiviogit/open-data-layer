import 'server-only';

/**
 * Runtime WebSocket URL for notifications (staging/production compose).
 * Falls back to `NEXT_PUBLIC_NOTIFICATIONS_WS_URL` from the web image build (local dev).
 */
export function getNotificationsWsPublicUrl(): string {
  const runtime = process.env.NOTIFICATIONS_WS_PUBLIC_URL?.trim() ?? '';
  if (runtime.length > 0) {
    return runtime;
  }
  return (process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_URL ?? '').trim();
}
