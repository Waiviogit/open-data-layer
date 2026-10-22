export function isInstacartIdentifierType(type: string): boolean {
  return type.trim().toLowerCase() === 'instacart';
}

export function objectHasInstacartRecipeButton(object: {
  object_type?: string | null;
  fields?: Record<string, unknown>;
}): boolean {
  if (object.object_type?.trim().toLowerCase() !== 'recipe') {
    return false;
  }
  const raw = object.fields?.identifier;
  if (!Array.isArray(raw)) {
    return false;
  }
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const type = (item as { type?: unknown }).type;
    if (typeof type === 'string' && isInstacartIdentifierType(type)) {
      return true;
    }
  }
  return false;
}
