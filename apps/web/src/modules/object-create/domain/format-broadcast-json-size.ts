/** Formats ODL JSON byte size for the publish dock (B or one-decimal KB). */
export function formatBroadcastJsonBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}
