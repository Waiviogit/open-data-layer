export function instacartWaitPath(objectId: string): string {
  return `/instacart/${encodeURIComponent(objectId)}`;
}

export async function loadInstacartRecipeLink(objectId: string): Promise<string> {
  const response = await fetch(
    `/api/objects/${encodeURIComponent(objectId)}/instacart-link`,
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = (await response.json()) as { url?: unknown };
  if (typeof body.url !== 'string' || !body.url.trim()) {
    throw new Error('missing url');
  }
  return body.url;
}
