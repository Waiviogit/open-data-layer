/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { GalleryImageFailedState } from './gallery-image-failed-state';

describe('GalleryImageFailedState', () => {
  it('renders the failed-to-load message', () => {
    render(
      <div className="relative aspect-square">
        <GalleryImageFailedState message="This image failed to load" />
      </div>,
    );

    expect(screen.getByText('This image failed to load')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'This image failed to load' })).toBeInTheDocument();
  });
});
