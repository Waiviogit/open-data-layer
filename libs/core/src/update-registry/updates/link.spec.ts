import { UPDATE_STRING_MAX } from '../string-limits';
import { UPDATE_LINK } from './link';

function parsedLink(value: string, type = 'instagram'): unknown {
  const result = UPDATE_LINK.schema.safeParse({ type, value });
  return result.success ? result.data : undefined;
}

describe('UPDATE_LINK', () => {
  it('accepts an http(s) URL', () => {
    expect(parsedLink('https://www.instagram.com/whitegarden_restaurant/')).toEqual({
      type: 'instagram',
      value: 'https://www.instagram.com/whitegarden_restaurant/',
    });
  });

  it('accepts a profile name and strips one leading @', () => {
    expect(parsedLink('  whitegarden_restaurant  ')).toEqual({
      type: 'instagram',
      value: 'whitegarden_restaurant',
    });
    expect(parsedLink('@acc', 'hive')).toEqual({ type: 'hive', value: 'acc' });
    expect(parsedLink('+14155552671', 'whatsapp')).toEqual({
      type: 'whatsapp',
      value: '+14155552671',
    });
  });

  it('rejects empty values, schemes, and whitespace', () => {
    expect(parsedLink('')).toBeUndefined();
    expect(parsedLink('   ')).toBeUndefined();
    expect(parsedLink('javascript:alert(1)')).toBeUndefined();
    expect(parsedLink('user name')).toBeUndefined();
    expect(parsedLink('instagram.com/user')).toBeUndefined();
  });

  it('enforces profile name max length', () => {
    expect(parsedLink('a'.repeat(UPDATE_STRING_MAX.NAME), 'github')).toEqual({
      type: 'github',
      value: 'a'.repeat(UPDATE_STRING_MAX.NAME),
    });
    expect(parsedLink('a'.repeat(UPDATE_STRING_MAX.NAME + 1), 'github')).toBeUndefined();
  });
});
