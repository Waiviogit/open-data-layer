/** True when `buildCreateOps` failed because the envelope must use IPFS batch import. */
export function isCreateChunkingOverflowError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  const msg = err.message;
  return (
    msg.includes('exceeds Hive custom_json limit') ||
    msg.includes('custom_json operations; maximum is')
  );
}
