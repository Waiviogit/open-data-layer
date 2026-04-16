import WebSocket from 'ws';

/**
 * Application-level outbound envelope (not Socket.IO; native ws JSON payload).
 */
export function wsSendJson(
  client: WebSocket,
  event: string,
  data: unknown,
): void {
  if (client.readyState !== WebSocket.OPEN) {
    return;
  }
  client.send(JSON.stringify({ event, data }));
}
