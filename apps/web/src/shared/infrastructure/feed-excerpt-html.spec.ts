jest.mock('marked', () => ({
  marked: {
    parse: (input: string) => `<p>${input}</p>`,
  },
}));

import { feedExcerptToSafeHtml } from './feed-excerpt-html';

const PREVIEW_URL = 'https://images.hive.blog/DQmExample/preview.png';

describe('feedExcerptToSafeHtml', () => {
  it('omits bare image URL when it matches feed preview', () => {
    const html = feedExcerptToSafeHtml(
      `Hello ${PREVIEW_URL} world`,
      { omitImageUrl: PREVIEW_URL },
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('Hello');
    expect(html).toContain('world');
  });

  it('omits markdown image when it matches feed preview', () => {
    const html = feedExcerptToSafeHtml(
      `Intro ![](${PREVIEW_URL}) outro`,
      { omitImageUrl: PREVIEW_URL },
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('Intro');
    expect(html).toContain('outro');
  });

  it('omits HTML img tag when it matches feed preview', () => {
    const html = feedExcerptToSafeHtml(
      `<p>Text</p><img src="${PREVIEW_URL}" alt="" /><p>More</p>`,
      { omitImageUrl: PREVIEW_URL },
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('Text');
    expect(html).toContain('More');
  });

  it('keeps other images when only preview URL is omitted', () => {
    const other = 'https://images.hive.blog/DQmOther/other.png';
    const html = feedExcerptToSafeHtml(`See ${other}`, {
      omitImageUrl: PREVIEW_URL,
    });
    expect(html).toContain(other);
    expect(html).toContain('<img');
  });

  it('proxies non-skipped excerpt images through Hive 0x0', () => {
    const src =
      'https://ipfs.busy.org/ipfs/QmQ2G2GCrBVmwAQ8J6RCKZRrsXWByWAB6NGNaS6hCGa7go';
    const html = feedExcerptToSafeHtml(`<p><img src="${src}" alt=""></p>`);
    expect(html).toContain(`https://images.hive.blog/0x0/${src}`);
    expect(html).toContain(`data-fallback-src="${src}"`);
  });

  it('strips 3Speak links and poster images when player is shown in the card', () => {
    const poster = 'https://cdn.example.com/poster.jpg';
    const html = feedExcerptToSafeHtml(
      `Watch https://3speak.tv/watch?v=author%2Fpost and ${poster}`,
      {
        omitImageUrls: [poster],
        stripThreeSpeakLinks: true,
      },
    );
    expect(html).not.toContain('3speak.tv');
    expect(html).not.toContain('<img');
    expect(html).not.toContain(poster);
  });

  it('normalizes Peakd 3Speak excerpt prefix to legacy-style watch label + body', () => {
    const poster =
      'https://i.ecency.com/DQmNSDpbjTxvzFpyQDwpNpX2gssGkdTXRFa2rfCwiSS4Eyp/thumb_1783842295927.jpg';
    const watchUrl =
      'https://3speak.tv/watch?v=sagarkothari88/8563feac';
    const html = feedExcerptToSafeHtml(
      `[![](${poster})](${watchUrl}) ▶️ [Watch on 3Speak](${watchUrl}) --- HiveReactKit improves profile translations, mobile safe-area handling,`,
      {
        omitImageUrls: [poster],
        stripThreeSpeakLinks: true,
      },
    );
    expect(html).not.toContain('3speak.tv');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('[');
    expect(html).toContain('▶ Watch on 3Speak');
    expect(html).toContain('HiveReactKit improves profile translations');
  });

  it('strips YouTube and TikTok share URLs when the card already shows a player', () => {
    const html = feedExcerptToSafeHtml(
      'Roman carbonara: spaghetti. https://www.youtube.com/watch?v=YCLDgh8WJFA and https://www.tiktok.com/@paulchefstudio/video/7660467808018386206 extra',
      { stripVideoLinks: true },
    );
    expect(html).not.toContain('youtube.com');
    expect(html).not.toContain('tiktok.com');
    expect(html).toContain('Roman carbonara');
    expect(html).toContain('extra');
  });

  it('strips Instagram, Facebook, X, and LinkedIn share URLs when the card already shows a player', () => {
    const html = feedExcerptToSafeHtml(
      'See https://www.instagram.com/p/DcncWF8DaIb/ and https://www.facebook.com/watch/?v=1234567890 plus https://x.com/foodster/status/1234567890123456789 and https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176 extra',
      { stripVideoLinks: true },
    );
    expect(html).not.toContain('instagram.com');
    expect(html).not.toContain('facebook.com');
    expect(html).not.toContain('x.com');
    expect(html).not.toContain('linkedin.com');
    expect(html).toContain('See');
    expect(html).toContain('extra');
  });
});
