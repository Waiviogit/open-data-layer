import { extractVideoThumbnailUrl } from './post-video-thumbnail';

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
      'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
    );
  });

  it('returns Vimeo thumbnail from vumbnail.com pattern', () => {
    expect(extractVideoThumbnailUrl('', 'https://vimeo.com/123456789')).toBe(
      'https://vumbnail.com/123456789.jpg',
    );
  });

  it('returns 3Speak poster from watch URL', () => {
    expect(
      extractVideoThumbnailUrl(
        '',
        'https://3speak.tv/watch?v=author%2Fmy-post-permlink',
      ),
    ).toBe('https://img.3speakcontent.co/author/my-post-permlink/post.png');
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
});
