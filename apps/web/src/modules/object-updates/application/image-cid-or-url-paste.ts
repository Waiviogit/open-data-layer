/** First http(s) URL in pasted plain text. */
export function parseHttpUrlFromPaste(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

export function imageFileFromClipboard(
  data: DataTransfer | null,
): File | null {
  if (!data?.items?.length) {
    return null;
  }
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}
