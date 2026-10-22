/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';

import { InstacartWaitView } from './instacart-wait-view';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        Instacart_Recipe_Loading: 'Your recipe is loading',
        Instacart_Link_Failed: 'Could not open Instacart',
      })[key] ?? key,
    locale: 'en-US',
  }),
}));

describe('InstacartWaitView', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('replaces the current page with the BFF url', async () => {
    const replaceLocation = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://www.instacart.com/x' }),
    }) as typeof fetch;

    render(<InstacartWaitView objectId="recipe-1" replaceLocation={replaceLocation} />);
    expect(screen.getByText('Your recipe is loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(replaceLocation).toHaveBeenCalledWith('https://www.instacart.com/x');
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/objects/recipe-1/instacart-link');
  });

  it('stays on the page and shows an error when the BFF fails', async () => {
    const replaceLocation = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
    }) as typeof fetch;

    render(<InstacartWaitView objectId="recipe-1" replaceLocation={replaceLocation} />);

    await waitFor(() => {
      expect(screen.getByText('Could not open Instacart')).toBeInTheDocument();
    });
    expect(replaceLocation).not.toHaveBeenCalled();
  });
});
