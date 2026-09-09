import {
  exceedsHiveCustomJsonLimit,
  utf8ByteLength,
} from './custom-json-size';
import { HIVE_CUSTOM_OP_DATA_MAX_LENGTH } from './constants';

describe('custom-json-size', () => {
  it('measures payload size in UTF-8 bytes rather than characters', () => {
    expect(utf8ByteLength('é'.repeat(4096))).toBe(8192);
  });

  it('treats a payload of exactly the Hive limit as broadcastable', () => {
    const json = 'x'.repeat(HIVE_CUSTOM_OP_DATA_MAX_LENGTH);
    expect(exceedsHiveCustomJsonLimit(json)).toBe(false);
  });

  it('treats a payload one byte over the Hive limit as oversize', () => {
    const json = 'x'.repeat(HIVE_CUSTOM_OP_DATA_MAX_LENGTH + 1);
    expect(exceedsHiveCustomJsonLimit(json)).toBe(true);
  });

  it('counts four-byte characters at their full UTF-8 width', () => {
    expect(utf8ByteLength('\u{1F600}')).toBe(4);
  });
});
