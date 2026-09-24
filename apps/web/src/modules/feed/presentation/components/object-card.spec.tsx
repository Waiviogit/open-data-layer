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
  isFavorited: false,
  hasSupervisedOwnership: false,
  hasExclusiveOwnership: false,
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

  it('hides ratings beyond the second row on mobile viewports', () => {
    const { container } = render(
      <ul>
        <ObjectCard
          object={{
            ...sampleObject,
            fields: {
              ...sampleObject.fields,
              aggregateRatingAspects: [
                {
                  dimension: 'Presentation',
                  update_id: 'u1',
                  averageRating: 4000,
                  userRating: null,
                  totalVoters: 2,
                },
                {
                  dimension: 'Value',
                  update_id: 'u2',
                  averageRating: 3000,
                  userRating: null,
                  totalVoters: 1,
                },
                {
                  dimension: 'Taste',
                  update_id: 'u3',
                  averageRating: 5000,
                  userRating: null,
                  totalVoters: 3,
                },
              ],
            },
          }}
          layout="catalog"
        />
      </ul>,
    );

    const ratingRows = container.querySelectorAll('[data-testid="star-rating"]');
    expect(ratingRows).toHaveLength(3);
    const ratingRow = ratingRows[2]?.parentElement?.parentElement;
    expect(ratingRow).toHaveClass('hidden');
    expect(ratingRow).toHaveClass('sm:flex');
  });

  it('catalog layout keeps horizontal row with fixed thumbnail at all breakpoints', () => {
    const { container } = render(
      <ul>
        <ObjectCard object={sampleObject} layout="catalog" />
      </ul>,
    );

    const flexRow = container.querySelector('.flex-row.items-start');
    expect(flexRow).not.toBeNull();
    expect(flexRow?.classList.contains('flex-col')).toBe(false);

    const thumbWrapper = container.querySelector('a[aria-label="View object: Spicy Agedashi Tofu"] span');
    expect(thumbWrapper).not.toBeNull();
    expect(thumbWrapper?.classList.contains('aspect-[4/3]')).toBe(false);
  });

  it('mapSidebar layout shows a single rating row', () => {
    const { container } = render(
      <ul>
        <ObjectCard
          object={{
            ...sampleObject,
            fields: {
              ...sampleObject.fields,
              description: 'a'.repeat(200),
              aggregateRatingAspects: [
                {
                  dimension: 'Overall',
                  update_id: 'u1',
                  averageRating: 4000,
                  userRating: null,
                  totalVoters: 2,
                },
                {
                  dimension: 'Service',
                  update_id: 'u2',
                  averageRating: 3000,
                  userRating: null,
                  totalVoters: 1,
                },
              ],
            },
          }}
          layout="mapSidebar"
        />
      </ul>,
    );

    expect(container.querySelectorAll('[data-testid="star-rating"]')).toHaveLength(1);
    expect(screen.queryByText('Service')).not.toBeInTheDocument();
  });
});

describe('ObjectCard price and brand/parent', () => {
  const productCard: ProjectedObjectView = {
    object_id: 'macadamia',
    object_type: 'product',
    semantic_type: null,
    weight: 1,
    fields: {
      name: 'Macadamia Tincture',
      price: 'MX$225.00',
      brand: {
        object_id: 'brand-1',
        object_type: 'business',
        fields: { name: 'Itzayana' },
      },
      parent: {
        object_id: 'shop-1',
        object_type: 'shop',
        fields: { name: 'Miss Bitcoin Shop' },
      },
      description: 'Herbal tincture',
    },
    isFavorited: false,
    hasSupervisedOwnership: false,
    hasExclusiveOwnership: false,
  };

  it('shows brand caption above title and price before type in subtitle', () => {
    render(
      <ul>
        <ObjectCard object={productCard} />
      </ul>,
    );

    expect(screen.getByText('Itzayana')).toBeInTheDocument();
    expect(screen.getByText('Macadamia Tincture')).toBeInTheDocument();
    expect(screen.getByText('MX$225.00')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  it('falls back to parent caption when brand is absent', () => {
    const withoutBrand: ProjectedObjectView = {
      ...productCard,
      fields: {
        name: productCard.fields.name,
        price: productCard.fields.price,
        parent: productCard.fields.parent,
        description: productCard.fields.description,
      },
    };

    render(
      <ul>
        <ObjectCard object={withoutBrand} />
      </ul>,
    );

    expect(screen.getByText('Miss Bitcoin Shop')).toBeInTheDocument();
    expect(screen.queryByText('Itzayana')).not.toBeInTheDocument();
  });

  it('omits caption and price segments when data is absent', () => {
    render(
      <ul>
        <ObjectCard object={sampleObject} />
      </ul>,
    );

    expect(screen.queryByText('Miss Bitcoin Shop')).not.toBeInTheDocument();
    expect(screen.getByText('Dish')).toBeInTheDocument();
    expect(screen.queryByText(/MX\$/)).not.toBeInTheDocument();
  });

  it('renders title tagline instead of description when title update is present', () => {
    const withTitle: ProjectedObjectView = {
      ...sampleObject,
      fields: {
        ...sampleObject.fields,
        title: 'Authentic Crispy Japanese Tofu',
        description: 'Long description of tofu recipe',
      },
    };

    render(
      <ul>
        <ObjectCard object={withTitle} />
      </ul>,
    );

    expect(screen.getByText('Authentic Crispy Japanese Tofu')).toBeInTheDocument();
    expect(screen.queryByText('Long description of tofu recipe')).not.toBeInTheDocument();
  });

  it('renders formatted address line when address is present', () => {
    const withAddress: ProjectedObjectView = {
      ...sampleObject,
      fields: {
        ...sampleObject.fields,
        address: {
          street: 'Pioneer Ave',
          locality: 'Agassiz',
          state: 'BC',
          postal_code: 'V0M 1A0',
          country: 'Canada',
        },
      },
    };

    render(
      <ul>
        <ObjectCard object={withAddress} />
      </ul>,
    );

    expect(screen.getByText('Pioneer Ave, Agassiz, BC')).toBeInTheDocument();
  });

  it('deduplicates object type from tag category labels in subtitle', () => {
    const withDuplicateTags: ProjectedObjectView = {
      ...sampleObject,
      object_type: 'restaurant',
      fields: {
        ...sampleObject.fields,
        tagCategoryItem: [
          { value: 'Restaurant' },
          { value: 'Italian' },
        ],
      },
    };

    render(
      <ul>
        <ObjectCard object={withDuplicateTags} />
      </ul>,
    );

    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Italian')).toBeInTheDocument();
    // Only one instance of Restaurant (from typeLabel, not duplicated in categoryLabels)
    expect(screen.getAllByText('Restaurant')).toHaveLength(1);
  });
});
