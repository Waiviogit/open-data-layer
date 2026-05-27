import {
  buildDescriptionPageBlocks,
  splitDescriptionParagraphs,
} from './build-description-page-blocks';

describe('splitDescriptionParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitDescriptionParagraphs('First\n\nSecond')).toEqual(['First', 'Second']);
  });

  it('splits HTML paragraphs when no blank lines', () => {
    expect(splitDescriptionParagraphs('<p>One</p><p>Two</p>')).toEqual(['<p>One</p>', '<p>Two</p>']);
  });
});

describe('buildDescriptionPageBlocks', () => {
  const photos = [
    { url: 'https://example.com/1.jpg', rankScore: 100, isAvatar: false },
    { url: 'https://example.com/2.jpg', rankScore: 90, isAvatar: false },
    { url: 'https://example.com/3.jpg', rankScore: 80, isAvatar: false },
  ];

  it('interleaves photos after paragraphs', () => {
    const blocks = buildDescriptionPageBlocks(['A', 'B'], photos);
    expect(blocks).toEqual([
      { kind: 'paragraph', html: 'A' },
      { kind: 'photo', url: 'https://example.com/1.jpg' },
      { kind: 'paragraph', html: 'B' },
      { kind: 'photo', url: 'https://example.com/2.jpg' },
      { kind: 'photo', url: 'https://example.com/3.jpg' },
    ]);
  });

  it('caps photos at 15', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.com/${i}.jpg`,
      rankScore: i,
      isAvatar: false,
    }));
    const blocks = buildDescriptionPageBlocks(['Only'], many);
    const photoBlocks = blocks.filter((b) => b.kind === 'photo');
    expect(photoBlocks).toHaveLength(15);
  });

  it('returns only photos when no paragraphs', () => {
    const blocks = buildDescriptionPageBlocks([], photos);
    expect(blocks).toEqual([
      { kind: 'photo', url: 'https://example.com/1.jpg' },
      { kind: 'photo', url: 'https://example.com/2.jpg' },
      { kind: 'photo', url: 'https://example.com/3.jpg' },
    ]);
  });
});
