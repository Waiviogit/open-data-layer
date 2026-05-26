export function toAbsoluteUrl(
  value: string | null | undefined,
  origin: string | null,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (!origin) {
    return null;
  }
  try {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}
