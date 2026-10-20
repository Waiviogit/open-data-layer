import { extractVideoEmbedUrl, extractVideoThumbnailUrl } from './post-video-thumbnail';

describe('extractVideoThumbnailUrl', () => {
  it('returns YouTube hqdefault from watch?v= URL in body', () => {
    const body = 'Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ today';
    expect(extractVideoThumbnailUrl('', body)).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('returns YouTube thumbnail from youtu.be short link', () => {
    expect(extractVideoThumbnailUrl('', 'Link https://youtu.be/abcdefghijk')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
  });

  it('returns YouTube thumbnail from embed URL', () => {
    expect(extractVideoThumbnailUrl('', '<iframe src="https://youtube.com/embed/abcdefghijk"></iframe>')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
  });

  it('returns YouTube thumbnail from shorts URL', () => {
    expect(extractVideoThumbnailUrl('', 'https://youtube.com/shorts/abcdefghijk')).toBe(
      'https://i.ytimg.com/vi/abcdefghijk/oar2.jpg',
    );
  });

  it('returns Vimeo thumbnail from vumbnail.com pattern', () => {
    expect(extractVideoThumbnailUrl('', 'https://vimeo.com/123456789')).toBe(
      'https://vumbnail.com/123456789.jpg',
    );
  });

  it('returns null for 3Speak watch URL (poster resolved client-side via play API)', () => {
    expect(
      extractVideoThumbnailUrl(
        '',
        'https://3speak.tv/watch?v=author%2Fmy-post-permlink',
      ),
    ).toBeNull();
  });

  it('returns DTube snaphash from json_metadata.video via Hive image proxy', () => {
    const meta = JSON.stringify({
      video: {
        info: { snaphash: 'QmTest1234567890abcdef' },
      },
    });
    expect(extractVideoThumbnailUrl(meta, '')).toBe(
      'https://images.hive.blog/p/QmTest1234567890abcdef?format=match&mode=fit',
    );
  });

  it('returns IPFS image from json_metadata.video.files.ipfs.img when snaphash missing', () => {
    const meta = JSON.stringify({
      video: {
        files: {
          ipfs: {
            img: { '360': 'QmImgHash123' },
          },
        },
      },
    });
    expect(extractVideoThumbnailUrl(meta, '')).toBe(
      'https://images.hive.blog/p/QmImgHash123?format=match&mode=fit',
    );
  });

  it('returns json_metadata.video.thumbnail when set', () => {
    const meta = JSON.stringify({
      video: {
        thumbnail: 'https://cdn.example.com/poster.jpg',
      },
    });
    expect(extractVideoThumbnailUrl(meta, '')).toBe('https://cdn.example.com/poster.jpg');
  });

  it('prefers json_metadata over body when both have video', () => {
    const meta = JSON.stringify({
      video: {
        info: { snaphash: 'QmFromMeta' },
      },
    });
    const body = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoThumbnailUrl(meta, body)).toBe(
      'https://images.hive.blog/p/QmFromMeta?format=match&mode=fit',
    );
  });

  it('returns null when no video in metadata or body', () => {
    expect(extractVideoThumbnailUrl('', 'Hello ![x](https://img.io/a.png) no video')).toBeNull();
  });

  it('falls back to body when json_metadata is invalid JSON', () => {
    expect(extractVideoThumbnailUrl('{not json', 'https://youtube.com/watch?v=abcdefghijk')).toBe(
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
  });

  it('returns null for json_metadata without video when body has no video', () => {
    expect(extractVideoThumbnailUrl('{"image":["https://x.jpg"]}', 'text')).toBeNull();
  });

  it('rejects path traversal in 3Speak watch param', () => {
    expect(extractVideoThumbnailUrl('', 'https://3speak.tv/watch?v=..%2Fevil')).toBeNull();
  });

  it('returns poster image from Peakd-style center block', () => {
    const body =
      '<center>[![](https://cdn.example.com/poster.jpg)](https://3speak.tv/watch?v=author%2Fpermlink)</center>';
    expect(extractVideoThumbnailUrl('', body)).toBe('https://cdn.example.com/poster.jpg');
  });

  it('returns null for center block without image when no other video thumb', () => {
    const body = '<center>https://3speak.tv/watch?v=author%2Fpermlink</center>';
    expect(extractVideoThumbnailUrl('', body)).toBeNull();
  });
});

describe('extractVideoEmbedUrl', () => {
  const ctx = { author: 'alice', permlink: 'my-post' };

  it('returns YouTube embed with autoplay from body', () => {
    expect(
      extractVideoEmbedUrl('', 'Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ today', ctx),
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0');
  });

  it('returns Vimeo player URL from body', () => {
    expect(extractVideoEmbedUrl('', 'https://vimeo.com/123456789', ctx)).toBe(
      'https://player.vimeo.com/video/123456789?autoplay=1',
    );
  });

  it('returns 3Speak embed from body', () => {
    expect(
      extractVideoEmbedUrl(
        '',
        'https://3speak.tv/watch?v=author%2Fmy-post-permlink',
        ctx,
      ),
    ).toBe(
      'https://play.3speak.tv/watch?v=author%2Fmy-post-permlink&mode=iframe&layout=desktop',
    );
  });

  it('returns 3Speak embed from 3speak.online URL', () => {
    expect(
      extractVideoEmbedUrl('', 'https://3speak.online/watch?v=author%2Fmy-post', ctx),
    ).toBe('https://play.3speak.tv/watch?v=author%2Fmy-post&mode=iframe&layout=desktop');
  });

  it('returns emb.d.tube from json_metadata snaphash', () => {
    const meta = JSON.stringify({
      video: {
        info: { author: 'bob', permlink: 'dtube-vid', snaphash: 'QmSnap' },
      },
    });
    expect(extractVideoEmbedUrl(meta, '', { author: 'alice', permlink: 'my-post' })).toBe(
      'https://emb.d.tube/#!/bob/dtube-vid',
    );
  });

  it('returns 3Speak embed from json_metadata platform', () => {
    const meta = JSON.stringify({
      video: {
        info: { platform: '3speak', author: 'u', permlink: 'p' },
      },
    });
    expect(extractVideoEmbedUrl(meta, '', ctx)).toBe(
      'https://play.3speak.tv/watch?v=u%2Fp&mode=iframe&layout=desktop',
    );
  });

  it('derives YouTube embed from img.youtube.com thumbnail in metadata', () => {
    const meta = JSON.stringify({
      video: {
        thumbnail: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      },
    });
    expect(extractVideoEmbedUrl(meta, '', ctx)).toBe(
      'https://www.youtube.com/embed/abcdefghijk?autoplay=1&rel=0',
    );
  });

  it('prefers json_metadata DTube embed over body YouTube', () => {
    const meta = JSON.stringify({
      video: {
        info: { snaphash: 'QmX', author: 'a', permlink: 'p' },
        content: { videohash: 'QmV' },
      },
    });
    expect(extractVideoEmbedUrl(meta, 'https://youtube.com/watch?v=abcdefghijk', ctx)).toBe(
      'https://emb.d.tube/#!/a/p',
    );
  });

  it('returns null when nothing matches', () => {
    expect(extractVideoEmbedUrl('{"image":["https://x.jpg"]}', 'text only', ctx)).toBeNull();
  });

  it('returns 3Speak embed from Peakd-style center block link', () => {
    const body =
      '<center>[![](https://cdn.example.com/poster.jpg)](https://3speak.tv/watch?v=author%2Fpermlink)</center>';
    expect(extractVideoEmbedUrl('', body, ctx)).toBe(
      'https://play.3speak.tv/watch?v=author%2Fpermlink&mode=iframe&layout=desktop',
    );
  });

  it('returns DTube embed from center block when body has no bare URL', () => {
    const body =
      '<center><a href="https://d.tube/#!/alice/my-video"><img src="https://cdn.example.com/poster.jpg"></a></center>';
    expect(extractVideoEmbedUrl('', body, ctx)).toBe(
      'https://emb.d.tube/#!/alice/my-video',
    );
  });

  it('returns a YouTube shorts share URL so the client can use a portrait frame', () => {
    expect(
      extractVideoEmbedUrl('', 'https://www.youtube.com/shorts/abcdefghijk', ctx),
    ).toBe('https://www.youtube.com/shorts/abcdefghijk');
  });

  it('returns a TikTok player URL from a share link in the body', () => {
    expect(
      extractVideoEmbedUrl(
        '',
        'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
        ctx,
      ),
    ).toBe('https://www.tiktok.com/player/v1/7660467808018386206');
  });

  it('returns an Instagram embed URL from a reel in the body', () => {
    expect(
      extractVideoEmbedUrl('', 'See https://www.instagram.com/reel/AbCdEfGhIjK extra', ctx),
    ).toBe('https://www.instagram.com/reel/AbCdEfGhIjK/embed');
  });

  it('returns a Facebook plugin URL from a watch link in the body', () => {
    expect(
      extractVideoEmbedUrl('', 'https://www.facebook.com/watch/?v=1234567890', ctx),
    ).toBe(
      'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890&show_text=false',
    );
  });

  it('returns an X embed URL from a status link in the body', () => {
    expect(
      extractVideoEmbedUrl(
        '',
        'https://x.com/foodster/status/1234567890123456789',
        ctx,
      ),
    ).toBe('https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789');
  });

  it('returns a LinkedIn embed URL from an activity URN in the body', () => {
    expect(
      extractVideoEmbedUrl(
        '',
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176\u2026?_l=ru_RU',
        ctx,
      ),
    ).toBe(
      'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
    );
  });
});
