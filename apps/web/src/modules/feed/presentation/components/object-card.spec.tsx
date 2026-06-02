/**
 * @jest-environment jsdom
 */
import type { ImgHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

import type { ProjectedObjectView } from '../../application/dto/object-fields';

jest.mock('@/shared/presentation', () => ({
  AVATAR_PLACEHOLDER_SRC: '/avatar-placeholder.png',
  shouldUnoptimizeRemoteImage: () => false,
}));

jest.mock('./object-page-link', () => ({
  ObjectPageLink: ({
    href,
    children,
    ariaLabel,
    className,
  }: {
    href: string;
    children: ReactNode;
    ariaLabel?: string;
    className?: string;
  }) => (
    <a href={href} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- Jest stub
    <img alt="" {...props} />
  ),
}));

jest.mock('@/modules/object/presentation/components/star-rating', () => ({
  StarRating: () => <div data-testid="star-rating" />,
}));

jest.mock('@/modules/object/presentation/components/administrative-heart-button', () => ({
  AdministrativeHeartButton: () => <button type="button" data-testid="admin-heart" />,
}));

import { ObjectCard } from './object-card';

const sampleObject: ProjectedObjectView = {
  object_id: 'spicy-tofu',
  object_type: 'dish',
  semantic_type: null,
  weight: 1.217,
  fields: {
    name: 'Spicy Agedashi Tofu',
    description: '(Spicy) Fish flakes',
  },
  hasAdministrativeAuthority: false,
  hasOwnershipAuthority: false,
};

describe('ObjectCard navigation', () => {
  it('thumbnail link navigates to the object page', () => {
    render(
      <ul>
        <ObjectCard object={sampleObject} />
      </ul>,
    );

    const thumbLink = screen.getByRole('link', { name: 'View object: Spicy Agedashi Tofu' });
    expect(thumbLink).toHaveAttribute('href', '/object/spicy-tofu');
  });

  it('title link navigates to the object page', () => {
    render(
      <ul>
        <ObjectCard object={sampleObject} />
      </ul>,
    );

    const titleLink = screen.getByRole('link', { name: 'Spicy Agedashi Tofu' });
    expect(titleLink).toHaveAttribute('href', '/object/spicy-tofu');
  });

  it('ratings and description are not wrapped in a link', () => {
    const { container } = render(
      <ul>
        <ObjectCard object={sampleObject} />
      </ul>,
    );

    const starRating = container.querySelector('[data-testid="star-rating"]');
    expect(starRating).not.toBeNull();
    expect(starRating?.closest('a')).toBeNull();
  });

  it('uses buttons instead of links when onNavigate is set', () => {
    const onNavigate = jest.fn();
    render(<ObjectCard object={sampleObject} onNavigate={onNavigate} as="div" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'View object: Spicy Agedashi Tofu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spicy Agedashi Tofu' })).toBeInTheDocument();
  });
});
