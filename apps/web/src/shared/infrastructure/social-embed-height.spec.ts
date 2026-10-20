import {
  INSTAGRAM_EMBED_LIKES_COMMENT_CHROME_PX,
  isSocialEmbedResizeOrigin,
  parseSocialEmbedHeight,
  socialEmbedFrameHeights,
} from './social-embed-height';

describe('parseSocialEmbedHeight', () => {
  it('reads Instagram MEASURE details.height', () => {
    expect(
      parseSocialEmbedHeight(
        JSON.stringify({ type: 'MEASURE', details: { height: 812 } }),
      ),
    ).toBe(812);
  });

  it('reads Facebook xfbml resize height', () => {
    expect(parseSocialEmbedHeight({ type: 'xfbml:resize', height: 640 })).toBe(
      640,
    );
  });

  it('reads nested Twitter widget params', () => {
    expect(
      parseSocialEmbedHeight({
        method: 'twttr.private.resize',
        params: [{ height: 520, width: 540 }],
      }),
    ).toBe(520);
  });

  it('rejects implausible values', () => {
    expect(parseSocialEmbedHeight({ height: 12 })).toBeNull();
    expect(parseSocialEmbedHeight({ height: 9000 })).toBeNull();
    expect(parseSocialEmbedHeight('nope')).toBeNull();
  });
});

describe('socialEmbedFrameHeights', () => {
  it('clips Instagram likes + comment chrome and leaves other hosts full height', () => {
    expect(
      socialEmbedFrameHeights(
        'https://www.instagram.com/p/DcncWF8DaIb/embed',
        883,
      ),
    ).toEqual({
      iframeHeight: 883,
      visibleHeight: 883 - INSTAGRAM_EMBED_LIKES_COMMENT_CHROME_PX,
    });
    expect(
      socialEmbedFrameHeights(
        'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fexample',
        584,
      ),
    ).toEqual({ iframeHeight: 584, visibleHeight: 584 });
  });
});

describe('isSocialEmbedResizeOrigin', () => {
  it('allows Instagram, Facebook, X, and LinkedIn', () => {
    expect(isSocialEmbedResizeOrigin('https://www.instagram.com')).toBe(true);
    expect(isSocialEmbedResizeOrigin('https://www.facebook.com')).toBe(true);
    expect(isSocialEmbedResizeOrigin('https://platform.twitter.com')).toBe(true);
    expect(isSocialEmbedResizeOrigin('https://www.linkedin.com')).toBe(true);
    expect(isSocialEmbedResizeOrigin('https://www.youtube.com')).toBe(false);
  });
});
