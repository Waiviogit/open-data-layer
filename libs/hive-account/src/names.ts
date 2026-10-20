const MIN_ACCOUNT_NAME_LENGTH = 3;
const MAX_ACCOUNT_NAME_LENGTH = 16;
const MIN_SEGMENT_LENGTH = 3;
const SUGGESTED_ACCOUNT_NAME_LENGTH = 8;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const SEGMENT_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export function isHiveAccountName(name: string): boolean {
  if (
    name.length < MIN_ACCOUNT_NAME_LENGTH ||
    name.length > MAX_ACCOUNT_NAME_LENGTH
  ) {
    return false;
  }

  return name.split('.').every((segment) => {
    if (segment.length < MIN_SEGMENT_LENGTH) {
      return false;
    }
    return SEGMENT_PATTERN.test(segment);
  });
}

export function suggestAccountName(): string {
  const entropy = new Uint8Array(SUGGESTED_ACCOUNT_NAME_LENGTH);
  crypto.getRandomValues(entropy);
  return Array.from(entropy, (byte) => LETTERS[byte % LETTERS.length]).join('');
}
