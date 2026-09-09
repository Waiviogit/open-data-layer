import { UPDATE_REGISTRY } from './update-registry';
import { UPDATE_STRING_MAX, UPDATE_ARRAY_MAX } from './string-limits';
import { UPDATE_ADMINS } from './updates/admins';
import { UPDATE_DESCRIPTION } from './updates/description';
import { UPDATE_INGREDIENTS } from './updates/ingredients';
import { UPDATE_NEWS_FILTER } from './updates/news-filter';
import { UPDATE_PAGE_CONTENT } from './updates/page-content';
import { UPDATE_URL } from './updates/url';
import { UPDATE_WIDGET } from './updates/widget';

const TEXT_VALUE_KINDS = new Set(['text', 'object_ref', 'user_ref']);

describe('UPDATE_REGISTRY string length limits', () => {
  it('rejects oversized strings for every text/object_ref/user_ref update', () => {
    const oversized = 'a'.repeat(UPDATE_STRING_MAX.BODY + 1);

    for (const [updateType, definition] of Object.entries(UPDATE_REGISTRY)) {
      if (!TEXT_VALUE_KINDS.has(definition.value_kind)) {
        continue;
      }

      const result = definition.schema.safeParse(oversized);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      } else {
        throw new Error(`Expected ${updateType} to reject oversized string`);
      }
    }
  });

  it('description accepts 2048 chars and rejects 2049', () => {
    expect(UPDATE_DESCRIPTION.schema.safeParse('a'.repeat(2048)).success).toBe(true);
    expect(UPDATE_DESCRIPTION.schema.safeParse('a'.repeat(2049)).success).toBe(false);
  });

  it('pageContent accepts 500_000 chars and rejects 500_001', () => {
    expect(UPDATE_PAGE_CONTENT.schema.safeParse('a'.repeat(500_000)).success).toBe(true);
    expect(UPDATE_PAGE_CONTENT.schema.safeParse('a'.repeat(500_001)).success).toBe(false);
  });

  it('admins accepts 16-char hive name and rejects 17', () => {
    expect(UPDATE_ADMINS.schema.safeParse('a'.repeat(16)).success).toBe(true);
    expect(UPDATE_ADMINS.schema.safeParse('a'.repeat(17)).success).toBe(false);
  });

  it('url accepts 2048-char URL and rejects 2049', () => {
    const url2048 = `https://example.com/${'a'.repeat(2028)}`;
    expect(url2048.length).toBe(2048);
    expect(UPDATE_URL.schema.safeParse(url2048).success).toBe(true);

    const url2049 = `https://example.com/${'a'.repeat(2029)}`;
    expect(url2049.length).toBe(2049);
    expect(UPDATE_URL.schema.safeParse(url2049).success).toBe(false);
  });

  it('widget.content rejects oversized body', () => {
    const valid = UPDATE_WIDGET.schema.safeParse({
      column: 'main',
      type: 'html',
      content: 'a'.repeat(UPDATE_STRING_MAX.BODY),
    });
    expect(valid.success).toBe(true);

    const invalid = UPDATE_WIDGET.schema.safeParse({
      column: 'main',
      type: 'html',
      content: 'a'.repeat(UPDATE_STRING_MAX.BODY + 1),
    });
    expect(invalid.success).toBe(false);
  });

  it('newsFilter rejects oversized allow_list', () => {
    const oversizedList = Array.from({ length: UPDATE_ARRAY_MAX.NEWS_LIST + 1 }, () => [
      'tag',
    ]);
    expect(
      UPDATE_NEWS_FILTER.schema.safeParse({
        allow_list: oversizedList,
        ignore_list: [],
        type_list: [],
      }).success,
    ).toBe(false);
  });

  it('ingredients rejects 201st element', () => {
    const items = Array.from({ length: UPDATE_ARRAY_MAX.INGREDIENTS + 1 }, () => 'flour');
    expect(UPDATE_INGREDIENTS.schema.safeParse(items).success).toBe(false);
  });
});
