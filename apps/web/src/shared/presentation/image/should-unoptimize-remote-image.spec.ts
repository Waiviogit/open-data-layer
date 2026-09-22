import { shouldUnoptimizeRemoteImage } from './should-unoptimize-remote-image';

describe('shouldUnoptimizeRemoteImage', () => {
  it('skips the Next optimizer for first-party ipfs-gateway images', () => {
    expect(
      shouldUnoptimizeRemoteImage(
        'https://waiviodev.com/ipfs-gateway/content/image/QmTA4vQkq4ZW5B1f8KXNPqCHt8ZD3CTrCGv8sYg32Ed691',
      ),
    ).toBe(true);
  });

  it('still optimizes ordinary remote images', () => {
    expect(shouldUnoptimizeRemoteImage('https://example.com/a.png')).toBe(false);
  });
});
