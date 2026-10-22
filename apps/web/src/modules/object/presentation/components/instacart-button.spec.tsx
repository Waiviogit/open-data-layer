/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { InstacartButton } from './instacart-button';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        Instacart_Get_Ingredients: 'Get Ingredients',
        Instacart_Get_Recipe_Ingredients: 'Get Recipe Ingredients',
        Instacart_Earns_Commissions: 'Earns commissions on purchases',
        Instacart_Link_Failed: 'Could not open Instacart',
      })[key] ?? key,
    locale: 'en-US',
  }),
}));

describe('InstacartButton', () => {
  const originalOpen = window.open;
  const originalFetch = global.fetch;

  afterEach(() => {
    window.open = originalOpen;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses card copy and omits the commissions disclaimer', () => {
    render(<InstacartButton objectId="recipe-1" variant="card" />);
    expect(screen.getByRole('button', { name: 'Get Ingredients' })).toBeInTheDocument();
    expect(screen.queryByText('Waivio may earn a commission.')).toBeNull();
    expect(global.fetch).toBe(originalFetch);
  });

  it('uses page copy and shows the commissions disclaimer', () => {
    render(<InstacartButton objectId="recipe-1" variant="page" />);
    expect(screen.getByRole('button', { name: 'Get Recipe Ingredients' })).toBeInTheDocument();
    expect(screen.getByText('Earns commissions on purchases')).toBeInTheDocument();
  });

  it('centers the page button when align is center', () => {
    const { container } = render(
      <InstacartButton objectId="recipe-1" variant="page" align="center" />,
    );
    expect(container.firstElementChild?.className).toContain('items-center');
  });

  it('opens the wait page and does not fetch from the opener', () => {
    window.open = jest.fn().mockReturnValue({ close: jest.fn() });
    global.fetch = jest.fn() as typeof fetch;

    render(<InstacartButton objectId="recipe-1" variant="card" />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Ingredients' }));

    expect(window.open).toHaveBeenCalledWith('/instacart/recipe-1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows an error when the wait tab is blocked', () => {
    window.open = jest.fn().mockReturnValue(null);

    render(<InstacartButton objectId="recipe-1" variant="card" />);
    fireEvent.click(screen.getByRole('button', { name: 'Get Ingredients' }));

    expect(screen.getByText('Could not open Instacart')).toBeInTheDocument();
  });

  it('does not fetch the Instacart URL on mount', () => {
    global.fetch = jest.fn() as typeof fetch;
    render(<InstacartButton objectId="recipe-1" variant="card" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
