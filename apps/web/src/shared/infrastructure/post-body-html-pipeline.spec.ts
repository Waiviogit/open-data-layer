jest.mock('marked', () => ({
  marked: {
    parse: (input: string) => `<p>${input}</p>`,
  },
}));

import {
  embedThreeSpeakInBody,
  postBodyLooksLikeHtml,
  sanitizePostBodyHtml,
} from './post-body-html-pipeline';

describe('postBodyLooksLikeHtml', () => {
  it('treats Peakd markdown with trailing HTML footer as markdown', () => {
    const body =
      '[![](https://cdn.example.com/poster.jpg)](https://3speak.tv/watch?v=author/post)\n\n# Title\n\nHello\n\n<br/> <sub>[via Apps from](https://example.com)</sub>';
    expect(postBodyLooksLikeHtml(body)).toBe(false);
  });
});

describe('embedThreeSpeakInBody', () => {
  it('replaces linked 3Speak poster with iframe and removes duplicate poster', () => {
    const html = embedThreeSpeakInBody(
      '<p><a href="https://3speak.tv/watch?v=author%2Fpost"><img src="https://cdn.example.com/poster.jpg" alt="" /></a></p>' +
        '<p><a href="https://3speak.tv/watch?v=author%2Fpost"><img src="https://cdn.example.com/poster.jpg" alt="" /></a></p>',
    );
    expect(html).toContain('play.3speak.tv');
    expect(html).toContain('blog-post-3speak-embed');
    expect(html).not.toContain('cdn.example.com/poster.jpg');
  });

  it('does not capture trailing parenthesis from markdown link URLs', () => {
    const html = embedThreeSpeakInBody(
      '(https://3speak.tv/watch?v=sagarkothari88/8563feac)',
    );
    expect(html).toContain(
      'https://play.3speak.tv/watch?v=sagarkothari88%2F8563feac&mode=iframe&layout=desktop',
    );
    expect(html).not.toContain('8563feac)');
  });
});

describe('sanitizePostBodyHtml', () => {
  it('embeds 3Speak watch URL from markdown body', () => {
    const html = sanitizePostBodyHtml(
      'Check https://3speak.tv/watch?v=alice%2Fhello today',
    );
    expect(html).toContain('play.3speak.tv');
    expect(html).toContain('blog-post-3speak-embed');
  });

  it('parses Peakd 3Speak markdown prefix and embeds video without broken URL', () => {
    const poster =
      'https://i.ecency.com/DQmNSDpbjTxvzFpyQDwpNpX2gssGkdTXRFa2rfCwiSS4Eyp/thumb_1783842295927.jpg';
    const watchUrl =
      'https://3speak.tv/watch?v=sagarkothari88/8563feac';
    const html = sanitizePostBodyHtml(
      `[![](${poster})](${watchUrl}) ▶️ [Watch on 3Speak](${watchUrl})\n\n---\n\n# HiveReactKit\n\nHello **world**.\n\n<br/> <sub>[via Apps from](https://example.com)</sub>`,
    );
    expect(html).toContain('blog-post-3speak-embed');
    expect(html).toContain('sagarkothari88%2F8563feac');
    expect(html).toContain('mode=iframe');
    expect(html).not.toContain('8563feac)');
    expect(html).not.toContain('[Watch on 3Speak]');
    expect(html).toContain('HiveReactKit');
  });

  it('proxies remote body images through Hive 0x0', () => {
    const src =
      'https://ipfs.busy.org/ipfs/QmQ2G2GCrBVmwAQ8J6RCKZRrsXWByWAB6NGNaS6hCGa7go';
    const html = sanitizePostBodyHtml(`![image](${src})`);
    expect(html).toContain(`https://images.hive.blog/0x0/${src}`);
    expect(html).toContain(`data-fallback-src="${src}"`);
  });

  it('turns bare steemit resize URLs in HTML bodies into proxied images', () => {
    const src =
      'https://steemitimages.com/640x0/https://ipfs.busy.org/ipfs/QmTo8opLZykpxLng6yxpgn5Aco5SDhrVMHVM4inZT1SxHE';
    const html = sanitizePostBodyHtml(`<center>${src}</center>`);
    expect(html).toContain(
      'https://images.hive.blog/0x0/https://images.hive.blog/640x0/https://ipfs.busy.org/ipfs/QmTo8opLZykpxLng6yxpgn5Aco5SDhrVMHVM4inZT1SxHE',
    );
    expect(html).toContain(`data-fallback-src="${src}"`);
  });

  it('does not re-proxy digitaloceanspaces images', () => {
    const src =
      'https://waivio.nyc3.digitaloceanspaces.com/1562259409_photo.jpg';
    const html = sanitizePostBodyHtml(`<p><img src="${src}" alt=""></p>`);
    expect(html).toContain(`src="${src}"`);
    expect(html).not.toContain('images.hive.blog/0x0');
    expect(html).not.toContain('data-fallback-src');
  });

  it('strips script tags from markdown body', () => {
    const html = sanitizePostBodyHtml('Hello<script>alert(1)</script>world');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips onerror handlers from raw HTML', () => {
    const html = sanitizePostBodyHtml(
      '<img src="https://example.com/x.png" onerror="alert(1)" />',
    );
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('strips javascript: href from raw HTML links', () => {
    const html = sanitizePostBodyHtml(
      '<a href="javascript:alert(1)">click me</a>',
    );
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('alert(1)');
  });

  it('embeds an Instagram post URL after surrounding text', () => {
    const html = sanitizePostBodyHtml(
      'WHITE GARDEN invites guests to enjoy sunny summer days.\n\nhttps://www.instagram.com/p/DcncWF8DaIb/',
    );
    expect(html).toContain('blog-post-instagram-embed');
    expect(html).toContain(
      'src="https://www.instagram.com/p/DcncWF8DaIb/embed"',
    );
    expect(html).toContain('WHITE GARDEN');
  });

  it('embeds Instagram href links and leaves profile URLs as links', () => {
    const embedded = sanitizePostBodyHtml(
      '<p><a href="https://www.instagram.com/p/DcncWF8DaIb/">https://www.instagram.com/p/DcncWF8DaIb/</a></p>',
    );
    expect(embedded).toContain('blog-post-instagram-embed');
    expect(embedded).not.toContain(
      '<a href="https://www.instagram.com/p/DcncWF8DaIb/"',
    );

    const profile = sanitizePostBodyHtml(
      '<p><a href="https://www.instagram.com/whitegarden_restaurant/">ig</a></p>',
    );
    expect(profile).not.toContain('blog-post-instagram-embed');
    expect(profile).toContain(
      'href="https://www.instagram.com/whitegarden_restaurant/"',
    );
  });

  it('embeds YouTube watch and shorts URLs', () => {
    const watch = sanitizePostBodyHtml(
      'See https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(watch).toContain('blog-post-youtube-embed');
    expect(watch).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');

    const shorts = sanitizePostBodyHtml(
      'https://www.youtube.com/shorts/abcdefghijk',
    );
    expect(shorts).toContain('blog-post-youtube-embed');
    expect(shorts).toContain('src="https://www.youtube.com/embed/abcdefghijk"');
  });

  it('does not nest a second iframe around an existing YouTube embed src', () => {
    const html = sanitizePostBodyHtml(
      '<p><iframe src="https://www.youtube.com/embed/abcdefghijk" title="YouTube video"></iframe></p>',
    );
    expect(html.match(/<iframe/g)?.length).toBe(1);
    expect(html).not.toContain('blog-post-youtube-embed');
  });
});
