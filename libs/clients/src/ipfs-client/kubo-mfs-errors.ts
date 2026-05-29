/** Kubo `files/cp` error when the MFS directory already contains the target name. */
export function isKuboMfsEntryAlreadyExists(
  status: number,
  responseBody: string,
): boolean {
  if (status !== 500) {
    return false;
  }
  const message = kuboApiErrorMessage(responseBody);
  return message.includes('already has entry');
}

export function kuboApiErrorMessage(responseBody: string): string {
  const trimmed = responseBody.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = JSON.parse(trimmed) as { Message?: string };
    return typeof parsed.Message === 'string' ? parsed.Message : trimmed;
  } catch {
    return trimmed;
  }
}
