/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => (key === 'Affiliate_Link' ? 'Affiliate Link' : key),
    locale: 'en-US',
  }),
}));

import { AffiliateLinksRow } from './affiliate-links-row';

describe('AffiliateLinksRow', () => {
  it('renders the i18n label and prefers the API image', () => {
    render(
      <AffiliateLinksRow
        links={[
          {
            link: 'https://www.amazon.com/dp/B000',
            image: 'https://cdn.example/logo.png',
            type: 'amazon',
          },
        ]}
      />,
    );

    expect(screen.getByText('Affiliate Link:')).toBeInTheDocument();
    expect(document.querySelector('img[src="https://cdn.example/logo.png"]')).not.toBeNull();
  });

  it('uses the amazon SVG when image is empty', () => {
    render(
      <AffiliateLinksRow
        links={[
          {
            link: 'https://www.amazon.com/dp/B000',
            image: '',
            type: 'amazon',
          },
        ]}
      />,
    );

    expect(
      document.querySelector('img[src="/images/affiliate/amazon-logo.svg"]'),
    ).not.toBeNull();
  });

  it('skips an unrenderable item', () => {
    const { container } = render(
      <AffiliateLinksRow
        links={[{ link: 'https://unknown.example/p/1', image: '', type: 'other' }]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens the merchant URL in a new tab', () => {
    render(
      <AffiliateLinksRow
        links={[
          {
            link: 'https://www.amazon.com/dp/B000',
            image: 'https://cdn.example/logo.png',
            type: 'amazon',
          },
        ]}
      />,
    );

    const anchor = screen.getByRole('link');
    expect(anchor.className).toContain('affiliate-merchant-btn');
    expect(anchor.className).not.toContain('rounded-btn');
    expect(anchor.className).not.toContain('bg-surface');
    expect(anchor.className).not.toContain('border-border');
    expect(anchor).toHaveAttribute('href', 'https://www.amazon.com/dp/B000');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor.getAttribute('rel') ?? '').toContain('noopener');
    expect(anchor.getAttribute('rel') ?? '').toContain('noreferrer');
  });

  it('stops click propagation so a host card does not navigate', () => {
    const hostClick = jest.fn();
    render(
      <div onClick={hostClick}>
        <AffiliateLinksRow
          links={[
            {
              link: 'https://www.amazon.com/dp/B000',
              image: 'https://cdn.example/logo.png',
              type: 'amazon',
            },
          ]}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('link'));
    expect(hostClick).not.toHaveBeenCalled();
  });

  it('does not render affiliateCode text', () => {
    render(
      <AffiliateLinksRow
        links={[
          {
            link: 'https://www.amazon.com/dp/B000',
            image: 'https://cdn.example/logo.png',
            type: 'amazon',
          },
        ]}
      />,
    );

    expect(screen.queryByText(/CODE::100/)).toBeNull();
  });
});
