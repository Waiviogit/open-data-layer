/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { UpdateRawJsonToggle } from './update-raw-json-toggle';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

describe('UpdateRawJsonToggle', () => {
  it('renders nothing when value is null', () => {
    const { container } = render(<UpdateRawJsonToggle value={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows View JSON by default and toggles formatted JSON on click', () => {
    const value = { album: 'Photos', cid: 'bafyTest' };

    render(<UpdateRawJsonToggle value={value} />);

    expect(screen.getByRole('button', { name: /object_updates_view_json/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText(/bafyTest/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /object_updates_view_json/ }));

    expect(screen.getByRole('button', { name: /object_updates_hide_json/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText(/bafyTest/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /object_updates_hide_json/ }));

    expect(screen.getByRole('button', { name: /object_updates_view_json/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText(/bafyTest/)).not.toBeInTheDocument();
  });

  it('shows formatted JSON immediately without a toggle in always mode', () => {
    render(<UpdateRawJsonToggle value={{ album: 'Photos', cid: 'bafyTest' }} mode="always" />);

    expect(screen.queryByRole('button', { name: /object_updates_view_json/ })).not.toBeInTheDocument();
    expect(screen.getByText(/bafyTest/)).toBeInTheDocument();
  });
});
