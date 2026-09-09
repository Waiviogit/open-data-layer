import type { BroadcastOdlOverflowError } from './broadcast-odl-op-with-overflow';

export function broadcastOverflowErrorMessage(
  error: BroadcastOdlOverflowError,
  t: (key: string) => string,
): string {
  if (error === 'unauthorized') {
    return t('object_edit_upload_unauthorized');
  }
  if (error === 'upload_failed') {
    return t('object_edit_upload_failed');
  }
  return t('object_edit_validation_error');
}
