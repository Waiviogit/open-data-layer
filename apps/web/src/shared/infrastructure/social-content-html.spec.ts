import { linkifyBareImageUrls, linkifyHiveMentions } from './social-content-html';

describe('linkifyHiveMentions', () => {
  it('wraps @username in profile links', () => {
    expect(linkifyHiveMentions('Hello @alice and @bob')).toBe(
      'Hello <a href="/@alice">@alice</a> and <a href="/@bob">@bob</a>',
    );
  });

  it('does not link email addresses', () => {
    const input = 'Contact user@example.com';
    expect(linkifyHiveMentions(input)).toBe(input);
  });
});

describe('linkifyBareImageUrls', () => {
  it('converts bare image URLs to img tags', () => {
    expect(linkifyBareImageUrls('see https://example.com/a.png here')).toBe(
      'see <img src="https://example.com/a.png" alt="" /> here',
    );
  });

  it('does not wrap URLs already inside img src attributes', () => {
    const html =
      '<p><img src="https://images.waivio.io/photo.jpg" alt="a"></p>';
    expect(linkifyBareImageUrls(html)).toBe(html);
  });

  it('linkifies extensionless steemit resize URLs inside HTML text', () => {
    const url =
      'https://steemitimages.com/640x0/https://ipfs.busy.org/ipfs/QmTo8opLZykpxLng6yxpgn5Aco5SDhrVMHVM4inZT1SxHE';
    expect(linkifyBareImageUrls(`<center>${url}</center>`)).toBe(
      `<center><img src="${url}" alt="" /></center>`,
    );
  });

  it('linkifies image filenames that contain parentheses', () => {
    const url =
      'https://steemitimages.com/640x0/https://cdn.steemitimages.com/DQmS4vR6jYqXCeDJbmVGyYKXj1cDcg1j7ybRnjk95nMbxZR/maxresdefault%20(1).jpg';
    expect(linkifyBareImageUrls(`see ${url} here`)).toBe(
      `see <img src="${url}" alt="" /> here`,
    );
  });
});
