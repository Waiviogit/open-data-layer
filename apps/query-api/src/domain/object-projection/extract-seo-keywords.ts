/**
 * Unique tag labels from projected `fields.tagCategoryItem` for SEO keywords meta.
 */
export function extractSeoKeywordsFromFields(
  fields: Record<string, unknown>,
): string[] | null {
  const raw = fields['tagCategoryItem'];
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: string[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const v = (item as { value?: unknown }).value;
    if (typeof v === 'string' && v.trim().length > 0) {
      out.push(v.trim());
    }
  }
  const unique = [...new Set(out)];
  return unique.length > 0 ? unique : null;
}
