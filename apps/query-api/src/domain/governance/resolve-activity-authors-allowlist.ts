import type { GovernanceResolverService } from './governance-resolver.service';

export type ResolveActivityAuthorsAllowlistInput = {
  authorsOnly?: boolean;
  governanceObjectIdFromHeader?: string;
  authorsGovernanceObjectId?: string;
};

function dedupeAuthors(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

/**
 * Builds the activity author allowlist.
 * `undefined` = no IN clause. Empty array = empty page (callers must not emit `IN ()`).
 */
export async function resolveActivityAuthorsAllowlist(
  resolver: Pick<GovernanceResolverService, 'resolveMergedForObjectView'>,
  input: ResolveActivityAuthorsAllowlistInput,
): Promise<string[] | undefined> {
  if (input.authorsOnly !== true) {
    return undefined;
  }

  const merged = await resolver.resolveMergedForObjectView(input.governanceObjectIdFromHeader);
  const overlayId = input.authorsGovernanceObjectId?.trim() ?? '';
  if (overlayId.length === 0) {
    return dedupeAuthors(merged.authors);
  }

  const overlay = await resolver.resolveMergedForObjectView(overlayId);
  return dedupeAuthors([...merged.authors, ...overlay.authors]);
}
