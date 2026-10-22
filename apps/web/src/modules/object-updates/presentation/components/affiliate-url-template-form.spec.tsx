/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { AffiliateUrlTemplateForm } from './affiliate-url-template-form';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

const AMAZON_TEMPLATE =
  'https://www.amazon.fr/dp/$productId/ref=nosim?tag=$affiliateCode';

describe('AffiliateUrlTemplateForm', () => {
  it('always shows the disclaimer', () => {
    const { rerender } = render(
      <AffiliateUrlTemplateForm value="" onChange={jest.fn()} />,
    );
    expect(screen.getByText('affiliate_url_template_info')).toBeInTheDocument();

    rerender(
      <AffiliateUrlTemplateForm value={AMAZON_TEMPLATE} onChange={jest.fn()} />,
    );
    expect(screen.getByText('affiliate_url_template_info')).toBeInTheDocument();
  });

  it('shows an inline error when the template is empty', () => {
    render(<AffiliateUrlTemplateForm value="" onChange={jest.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('affiliate_url_error');
  });

  it('shows an inline error for an http template', () => {
    render(
      <AffiliateUrlTemplateForm
        value="http://a.com/$productId?t=$affiliateCode"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('affiliate_url_error');
  });

  it('hides the inline error when both camel tokens are present', () => {
    render(
      <AffiliateUrlTemplateForm value={AMAZON_TEMPLATE} onChange={jest.fn()} />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
