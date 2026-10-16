/**
 * @jest-environment jsdom
 */
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';

jest.mock('next/link', () => {
  function MockLink({
    children,
    prefetch,
    href,
  }: {
    children: ReactNode;
    prefetch?: boolean;
    href: string;
  }) {
    return (
      <a href={href} data-prefetch={String(prefetch)}>
        {children}
      </a>
    );
  }
  return {
    __esModule: true,
    default: MockLink,
    useLinkStatus: () => ({ pending: false }),
  };
});

import { ObjectPageLink } from './object-page-link';

describe('ObjectPageLink', () => {
  it('disables Next.js prefetch', () => {
    const { container } = render(
      <ObjectPageLink href="/object/photography">photo</ObjectPageLink>,
    );
    expect(container.querySelector('a')?.getAttribute('data-prefetch')).toBe(
      'false',
    );
  });
});
