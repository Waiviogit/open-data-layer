/** Human-readable label for how many `object_updates` rows exist for a type. */
export function formatUpdateCountLabel(
  count: number,
  t: (key: string) => string,
): string {
  if (count === 0) {
    return t('object_edit_update_count_zero');
  }
  if (count === 1) {
    return t('object_edit_update_count_one');
  }
  const template = t('object_edit_update_count_many');
  return template.includes('{count}')
    ? template.replace('{count}', String(count))
    : `${count} ${template}`;
}
