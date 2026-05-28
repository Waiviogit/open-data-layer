/** Max characters shown in object card description excerpts (shop, feed, list menu). */
export const OBJECT_CARD_DESCRIPTION_MAX_LENGTH = 300;

export function truncateObjectCardDescription(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= OBJECT_CARD_DESCRIPTION_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, OBJECT_CARD_DESCRIPTION_MAX_LENGTH)}…`;
}
