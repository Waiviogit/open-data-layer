import {
  buildVideoEmbedUrl,
  isNativeFeedVideoUrl,
  parseVideoUrl,
} from './video-preview';

describe('parseVideoUrl', () => {
  it('returns YouTube preview from watch URL', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('returns YouTube preview from youtu.be short link', () => {
    expect(parseVideoUrl('https://youtu.be/abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('returns YouTube preview from embed URL', () => {
    expect(parseVideoUrl('https://youtube.com/embed/abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('returns a portrait YouTube preview from shorts URL', () => {
    expect(parseVideoUrl('https://youtube.com/shorts/abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/oar2.jpg',
      layout: 'portrait',
    });
  });

  it('returns Vimeo preview', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      videoId: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
      thumbnailUrl: 'https://vumbnail.com/123456789.jpg',
      layout: 'landscape',
    });
  });

  it('returns 3Speak preview from watch URL', () => {
    expect(
      parseVideoUrl('https://3speak.tv/watch?v=author%2Fmy-post-permlink'),
    ).toEqual({
      provider: '3speak',
      videoId: 'author/my-post-permlink',
      embedUrl:
        'https://play.3speak.tv/watch?v=author%2Fmy-post-permlink&mode=iframe&layout=desktop',
      thumbnailUrl: null,
      layout: 'landscape',
    });
  });

  it('returns 3Speak preview from play.3speak.tv embed URL', () => {
    expect(
      parseVideoUrl(
        'https://play.3speak.tv/watch?v=author%2Fpermlink&mode=iframe&layout=desktop',
      ),
    ).toEqual({
      provider: '3speak',
      videoId: 'author/permlink',
      embedUrl:
        'https://play.3speak.tv/watch?v=author%2Fpermlink&mode=iframe&layout=desktop',
      thumbnailUrl: null,
      layout: 'landscape',
    });
  });

  it('returns DTube preview', () => {
    expect(parseVideoUrl('https://d.tube/#!/alice/my-video')).toEqual({
      provider: 'dtube',
      videoId: 'alice/my-video',
      embedUrl: 'https://emb.d.tube/#!/alice/my-video',
      thumbnailUrl: null,
      layout: 'landscape',
    });
  });

  it('returns a portrait TikTok preview from a share URL', () => {
    expect(
      parseVideoUrl(
        'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
      ),
    ).toEqual({
      provider: 'tiktok',
      videoId: '7660467808018386206',
      embedUrl: 'https://www.tiktok.com/player/v1/7660467808018386206',
      thumbnailUrl: null,
      layout: 'portrait',
    });
  });

  it('returns a portrait TikTok preview from a player embed URL', () => {
    expect(
      parseVideoUrl('https://www.tiktok.com/player/v1/7660467808018386206'),
    ).toEqual({
      provider: 'tiktok',
      videoId: '7660467808018386206',
      embedUrl: 'https://www.tiktok.com/player/v1/7660467808018386206',
      thumbnailUrl: null,
      layout: 'portrait',
    });
  });

  it('returns null for regular image URL', () => {
    expect(parseVideoUrl('https://cdn.example.com/photo.jpg')).toBeNull();
  });

  it('rewrites a YouTube live share link to the official embed', () => {
    expect(parseVideoUrl('https://www.youtube.com/live/abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('rewrites a mobile YouTube shorts share link', () => {
    expect(parseVideoUrl('https://m.youtube.com/shorts/abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/oar2.jpg',
      layout: 'portrait',
    });
  });

  it('rewrites a YouTube Music watch share link', () => {
    expect(parseVideoUrl('https://music.youtube.com/watch?v=abcdefghijk')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('rewrites an unlisted Vimeo share link with the privacy hash', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789/a1b2c3d4')?.embedUrl).toBe(
      'https://player.vimeo.com/video/123456789?h=a1b2c3d4',
    );
  });

  it('rewrites a DTube /v/ share link to the DTube embed', () => {
    expect(parseVideoUrl('https://d.tube/v/alice/my-video')).toEqual({
      provider: 'dtube',
      videoId: 'alice/my-video',
      embedUrl: 'https://emb.d.tube/#!/alice/my-video',
      thumbnailUrl: null,
      layout: 'landscape',
    });
  });

  it('returns an Instagram reel as a widget player', () => {
    expect(parseVideoUrl('https://www.instagram.com/reel/AbCdEfGhIjK')).toEqual({
      provider: 'instagram',
      videoId: 'reel/AbCdEfGhIjK',
      embedUrl: 'https://www.instagram.com/reel/AbCdEfGhIjK/embed',
      thumbnailUrl: null,
      layout: 'widget',
    });
  });

  it('returns an Instagram /p/ embed URL as a widget player', () => {
    expect(
      parseVideoUrl('https://www.instagram.com/p/DcncWF8DaIb/embed'),
    ).toEqual({
      provider: 'instagram',
      videoId: 'p/DcncWF8DaIb',
      embedUrl: 'https://www.instagram.com/p/DcncWF8DaIb/embed',
      thumbnailUrl: null,
      layout: 'widget',
    });
  });

  it('rejects Instagram profile URLs', () => {
    expect(
      parseVideoUrl('https://www.instagram.com/whitegarden_restaurant/'),
    ).toBeNull();
  });

  it('returns a landscape Facebook watch URL', () => {
    expect(parseVideoUrl('https://www.facebook.com/watch/?v=1234567890')).toEqual({
      provider: 'facebook',
      videoId: 'https://www.facebook.com/watch/?v=1234567890',
      embedUrl:
        'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890&show_text=false',
      thumbnailUrl: null,
      layout: 'landscape',
    });
  });

  it('returns a portrait Facebook reel URL', () => {
    expect(parseVideoUrl('https://www.facebook.com/reel/9876543210')).toEqual({
      provider: 'facebook',
      videoId: 'https://www.facebook.com/reel/9876543210',
      embedUrl:
        'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F9876543210&show_text=false',
      thumbnailUrl: null,
      layout: 'portrait',
    });
  });

  it('returns a Facebook plugin URL from a page videos path', () => {
    expect(
      parseVideoUrl('https://www.facebook.com/SomePage/videos/1234567890'),
    ).toEqual(
      expect.objectContaining({
        provider: 'facebook',
        layout: 'landscape',
        embedUrl:
          'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890&show_text=false',
      }),
    );
  });

  it('returns a LinkedIn activity embed and strips excerpt ellipsis', () => {
    const expected = {
      provider: 'linkedin',
      videoId: 'activity:7514384350902194176',
      embedUrl:
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
      thumbnailUrl: null,
      layout: 'widget',
    };
    expect(
      parseVideoUrl(
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
      ),
    ).toEqual(expected);
    expect(
      parseVideoUrl(
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176\u2026?_l=ru_RU',
      ),
    ).toEqual(expected);
    expect(
      parseVideoUrl(
        'https://www.linkedin.com/feed/update/urn:li:activity:7514384350902194176%E2%80%A6',
      ),
    ).toEqual(expected);
  });

  it('returns an X status embed from twitter.com and x.com', () => {
    const expected = {
      provider: 'x',
      videoId: '1234567890123456789',
      embedUrl:
        'https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789',
      thumbnailUrl: null,
      layout: 'widget',
    };
    expect(
      parseVideoUrl('https://twitter.com/foodster/status/1234567890123456789'),
    ).toEqual(expected);
    expect(
      parseVideoUrl('https://x.com/foodster/status/1234567890123456789?s=20'),
    ).toEqual(expected);
  });

  it('leaves out-of-scope hosts unclassified', () => {
    const urls = [
      'https://www.twitch.tv/videos/1',
      'https://www.dailymotion.com/video/x7tgad0',
      'https://rumble.com/v1-example.html',
      'https://odysee.com/@a:b/c',
    ];
    for (const url of urls) {
      expect(parseVideoUrl(url)).toBeNull();
    }
  });

  it('marks Instagram, Facebook, X, LinkedIn, and TikTok as native feed players', () => {
    expect(
      isNativeFeedVideoUrl('https://www.instagram.com/p/DcncWF8DaIb/'),
    ).toBe(true);
    expect(
      isNativeFeedVideoUrl('https://www.facebook.com/watch/?v=1234567890'),
    ).toBe(true);
    expect(
      isNativeFeedVideoUrl('https://x.com/foodster/status/1234567890123456789'),
    ).toBe(true);
    expect(
      isNativeFeedVideoUrl(
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
      ),
    ).toBe(true);
    expect(
      isNativeFeedVideoUrl(
        'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
      ),
    ).toBe(true);
    expect(
      isNativeFeedVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe(false);
  });

  it('rejects an empty share string', () => {
    expect(parseVideoUrl('')).toBeNull();
    expect(parseVideoUrl('   ')).toBeNull();
  });

  it('rejects a YouTube id that is not 11 characters', () => {
    expect(parseVideoUrl('https://www.youtube.com/live/abcdefghij')).toBeNull();
    expect(parseVideoUrl('https://www.youtube.com/live/abcdefghijkl')).toBeNull();
  });

  it('does not treat a YouTube poster URL as a video', () => {
    expect(
      parseVideoUrl('https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg'),
    ).toBeNull();
  });

  it('drops share-sheet query junk from a YouTube live link', () => {
    expect(parseVideoUrl('https://www.youtube.com/live/abcdefghijk?si=sharetoken')).toEqual({
      provider: 'youtube',
      videoId: 'abcdefghijk',
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
      layout: 'landscape',
    });
  });

  it('returns null for path traversal in 3Speak watch param', () => {
    expect(parseVideoUrl('https://3speak.tv/watch?v=..%2Fevil')).toBeNull();
  });

  it('normalizes protocol-relative URLs', () => {
    expect(parseVideoUrl('//youtu.be/abcdefghijk')?.videoId).toBe('abcdefghijk');
  });
});

describe('buildVideoEmbedUrl', () => {
  it('adds autoplay for YouTube', () => {
    const preview = parseVideoUrl('https://youtube.com/watch?v=abcdefghijk');
    expect(preview).not.toBeNull();
    expect(buildVideoEmbedUrl(preview!, { autoplay: true })).toBe(
      'https://www.youtube.com/embed/abcdefghijk?autoplay=1&rel=0',
    );
  });

  it('adds autoplay for Vimeo', () => {
    const preview = parseVideoUrl('https://vimeo.com/123456789');
    expect(preview).not.toBeNull();
    expect(buildVideoEmbedUrl(preview!, { autoplay: true })).toBe(
      'https://player.vimeo.com/video/123456789?autoplay=1',
    );
  });

  it('keeps the TikTok player URL', () => {
    const preview = parseVideoUrl(
      'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
    );
    expect(preview).not.toBeNull();
    expect(buildVideoEmbedUrl(preview!, { autoplay: true })).toBe(
      'https://www.tiktok.com/player/v1/7660467808018386206',
    );
  });

  it('keeps Instagram, Facebook, and X embed URLs without autoplay params', () => {
    expect(
      buildVideoEmbedUrl(parseVideoUrl('https://www.instagram.com/p/DcncWF8DaIb/')!, {
        autoplay: true,
      }),
    ).toBe('https://www.instagram.com/p/DcncWF8DaIb/embed');
    expect(
      buildVideoEmbedUrl(
        parseVideoUrl('https://www.facebook.com/watch/?v=1234567890')!,
        { autoplay: true },
      ),
    ).toContain('facebook.com/plugins/video.php');
    expect(
      buildVideoEmbedUrl(
        parseVideoUrl('https://x.com/foodster/status/1234567890123456789')!,
        { autoplay: true },
      ),
    ).toBe('https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789');
  });
});
