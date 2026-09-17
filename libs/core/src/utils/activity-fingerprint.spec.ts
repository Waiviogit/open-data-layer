import {
  computeActivityFingerprint,
  formatPHashHex,
  hammingDistance64,
  isNearDuplicate,
  normalizeOriginalText,
  parsePHashHex,
} from './activity-fingerprint';

const LONG_CAPTION =
  'Our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening';

/** Frozen vector — must match docs/spec/osl/activity-fingerprint.md */
const LONG_CAPTION_NORMALIZED =
  'our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening';
const LONG_CAPTION_TEXT_SIMHASH_HEX = '9528595b27876241';

describe('normalizeOriginalText', () => {
  it('strips urls handles hashtags and emoji', () => {
    const base = normalizeOriginalText(LONG_CAPTION);
    const variant = normalizeOriginalText(
      `${LONG_CAPTION} 🔥 https://example.com/p/1 @chef #food #yum`,
    );
    expect(variant).toBe(base);
  });

  it('normalizes cyrillic with emoji and tags', () => {
    const a = normalizeOriginalText(
      'Наш сезонный дегустационный сет из локальных продуктов готовится каждый вечер',
    );
    const b = normalizeOriginalText(
      'Наш сезонный дегустационный сет из локальных продуктов готовится каждый вечер 🔥 #food',
    );
    expect(a).toBe(b);
  });

  it('returns empty for emoji-only caption', () => {
    expect(normalizeOriginalText('🔥🔥 #food #yum')).toBe('');
  });
});

describe('computeActivityFingerprint', () => {
  it('pins LONG_CAPTION frozen hex vector', () => {
    expect(normalizeOriginalText(LONG_CAPTION)).toBe(LONG_CAPTION_NORMALIZED);
    const fp = computeActivityFingerprint(LONG_CAPTION);
    expect(fp.textSimhash).not.toBeNull();
    expect(formatPHashHex(fp.textSimhash!)).toBe(LONG_CAPTION_TEXT_SIMHASH_HEX);
  });

  it('collapses emoji hashtag and url variants to one hash', () => {
    const a = computeActivityFingerprint(LONG_CAPTION);
    const b = computeActivityFingerprint(
      `${LONG_CAPTION} 🔥 #food https://instagram.com/p/abc @chef #yum`,
    );
    expect(a.textSimhash).not.toBeNull();
    expect(a.textSimhash).toBe(b.textSimhash);
    expect(a.v).toBe(1);
  });

  it('treats trailing punctuation as identical hash', () => {
    const a = computeActivityFingerprint(LONG_CAPTION);
    const b = computeActivityFingerprint(`${LONG_CAPTION}!!!`);
    expect(a.textSimhash).toBe(b.textSimhash);
  });

  it('treats unrelated captions as distinct', () => {
    const a = computeActivityFingerprint(LONG_CAPTION);
    const b = computeActivityFingerprint(
      'Completely different content about mountain hiking trails and alpine lakes in the northern region during winter months for experienced climbers only',
    );
    expect(a.textSimhash).not.toBeNull();
    expect(b.textSimhash).not.toBeNull();
    expect(hammingDistance64(a.textSimhash!, b.textSimhash!)).toBeGreaterThan(10);
  });

  it('returns null hash below minimum length', () => {
    const short = computeActivityFingerprint('short caption here');
    expect(short.textSimhash).toBeNull();
    expect(short.normalizedLength).toBeLessThan(40);
  });

  it('returns hash at exactly 40 normalized chars', () => {
    const text = 'a'.repeat(40);
    const fp = computeActivityFingerprint(text);
    expect(fp.normalizedLength).toBe(40);
    expect(fp.textSimhash).not.toBeNull();
  });

  it('keeps every hash inside signed 64-bit range', () => {
    const samples = [
      LONG_CAPTION,
      'Another long caption for testing signed bigint range constraints on simhash output values here',
      'Третий длинный текст для проверки диапазона bigint в симхеше активности объекта',
    ];
    for (const sample of samples) {
      const { textSimhash } = computeActivityFingerprint(sample);
      if (textSimhash == null) {
        continue;
      }
      expect(textSimhash).toBeGreaterThanOrEqual(BigInt('-9223372036854775808'));
      expect(textSimhash).toBeLessThanOrEqual(BigInt('9223372036854775807'));
    }
  });
});

describe('hammingDistance64', () => {
  it('measures distance over 64 bits', () => {
    expect(hammingDistance64(BigInt(0), BigInt(0))).toBe(0);
    expect(hammingDistance64(BigInt(0), BigInt(-1))).toBe(64);
    expect(hammingDistance64(BigInt(1), BigInt(0))).toBe(1);
  });
});

describe('parsePHashHex / formatPHashHex', () => {
  it('round-trips high-bit values', () => {
    expect(parsePHashHex('ffffffffffffffff')).toBe(BigInt(-1));
    expect(formatPHashHex(BigInt(-1))).toBe('ffffffffffffffff');
  });

  it('rejects malformed hex', () => {
    expect(parsePHashHex('abc')).toBeNull();
    expect(parsePHashHex('zzzzzzzzzzzzzzzz')).toBeNull();
    expect(parsePHashHex('0123456789abcde')).toBeNull();
  });
});

describe('isNearDuplicate', () => {
  const t = 1_700_000_000;

  it('refuses different fingerprint versions', () => {
    expect(
      isNearDuplicate(
        { fingerprintV: 1, textSimhash: BigInt(1), imagePhashes: [], sourceTimeUnix: t },
        { fingerprintV: 2, textSimhash: BigInt(1), imagePhashes: [], sourceTimeUnix: t },
      ),
    ).toBeNull();
  });

  it('matches text at threshold and rejects one bit beyond', () => {
    const base = BigInt('0x0f0f0f0f0f0f0f0f');
    const at3 = base ^ (BigInt(1) | (BigInt(1) << BigInt(1)) | (BigInt(1) << BigInt(2)));
    const at4 = base ^ (BigInt(1) | (BigInt(1) << BigInt(1)) | (BigInt(1) << BigInt(2)) | (BigInt(1) << BigInt(3)));
    expect(
      isNearDuplicate(
        { fingerprintV: 1, textSimhash: base, imagePhashes: [], sourceTimeUnix: t },
        { fingerprintV: 1, textSimhash: at3, imagePhashes: [], sourceTimeUnix: t + 3600 },
      ),
    ).toBe('simhash');
    expect(
      isNearDuplicate(
        { fingerprintV: 1, textSimhash: base, imagePhashes: [], sourceTimeUnix: t },
        { fingerprintV: 1, textSimhash: at4, imagePhashes: [], sourceTimeUnix: t + 3600 },
      ),
    ).toBeNull();
  });

  it('matches on image phash when text differs', () => {
    expect(
      isNearDuplicate(
        {
          fingerprintV: 1,
          textSimhash: BigInt(1),
          imagePhashes: [BigInt('0x00ff00ff00ff00ff')],
          sourceTimeUnix: t,
        },
        {
          fingerprintV: 1,
          textSimhash: BigInt('0xffffffffffffffff'),
          imagePhashes: [BigInt('0x00ff00ff00ff00fe')],
          sourceTimeUnix: t + 100,
        },
      ),
    ).toBe('phash');
  });

  it('returns null when neither side has hashes', () => {
    expect(
      isNearDuplicate(
        { fingerprintV: 1, textSimhash: null, imagePhashes: [], sourceTimeUnix: t },
        { fingerprintV: 1, textSimhash: null, imagePhashes: [], sourceTimeUnix: t },
      ),
    ).toBeNull();
  });

  it('ignores candidates outside the 72h window', () => {
    const h = computeActivityFingerprint(LONG_CAPTION).textSimhash!;
    expect(
      isNearDuplicate(
        { fingerprintV: 1, textSimhash: h, imagePhashes: [], sourceTimeUnix: t },
        { fingerprintV: 1, textSimhash: h, imagePhashes: [], sourceTimeUnix: t + 73 * 3600 },
      ),
    ).toBeNull();
  });
});
