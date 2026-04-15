import {
  extractCryptoTickers,
  extractHashtags,
  extractLinks,
  extractMentions,
} from './thread-extractors';
import {
  getThreadType,
  THREAD_TYPE_ECENCY,
  THREAD_TYPE_LEO,
} from '../../constants/thread-accounts';

describe('thread-extractors', () => {
  it('extractHashtags matches #tags and /object/slug', () => {
    const body = 'Hello #hive read /object/abc-12 and #two';
    const tags = extractHashtags(body);
    expect(tags).toContain('hive');
    expect(tags).toContain('abc-12');
    expect(tags).toContain('two');
  });

  it('extractMentions strips @', () => {
    expect(extractMentions('Hi @alice.cc and @bob')).toEqual([
      'alice.cc',
      'bob',
    ]);
  });

  it('extractLinks finds http(s) urls', () => {
    const body = 'see https://example.com/a and http://x.org';
    const urls = extractLinks(body);
    expect(urls).toContain('https://example.com/a');
    expect(urls).toContain('http://x.org');
  });

  it('extractCryptoTickers uses symbol list only', () => {
    const text = 'Pay $HIVE and $BTC today';
    expect(extractCryptoTickers(text, ['HIVE', 'BTC', 'ETH'])).toEqual([
      'HIVE',
      'BTC',
    ]);
  });

  it('getThreadType maps known parents', () => {
    expect(getThreadType('ecency.waves')).toBe(THREAD_TYPE_ECENCY);
    expect(getThreadType('leothreads')).toBe(THREAD_TYPE_LEO);
    expect(getThreadType('unknown.parent')).toBe(THREAD_TYPE_LEO);
  });
});
