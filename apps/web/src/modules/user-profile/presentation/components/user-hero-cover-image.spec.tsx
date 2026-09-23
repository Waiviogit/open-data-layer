/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';

import { UserHeroCoverImage } from './user-hero-cover-image';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    onError,
  }: {
    src: string;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock
    <img src={src} data-testid="hero-cover" onError={onError} alt="" />
  ),
}));

const ESTEEM = 'https://img.esteem.app/kbgnol.png';

describe('UserHeroCoverImage', () => {
  it('loads cover URLs directly first', () => {
    render(<UserHeroCoverImage coverImageUrl={ESTEEM} />);
    expect(screen.getByTestId('hero-cover')).toHaveAttribute('src', ESTEEM);
  });

  it('falls back to Hive proxy then hides cover on repeated errors', () => {
    render(<UserHeroCoverImage coverImageUrl={ESTEEM} />);
    const img = screen.getByTestId('hero-cover');

    fireEvent.error(img);
    expect(img).toHaveAttribute(
      'src',
      `https://images.hive.blog/0x0/${ESTEEM}`,
    );

    fireEvent.error(img);
    expect(screen.queryByTestId('hero-cover')).not.toBeInTheDocument();
  });
});
