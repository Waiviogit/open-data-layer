/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { AffiliateGeoAreaForm } from './affiliate-geo-area-form';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

function openSelect() {
  fireEvent.click(screen.getByRole('button', { expanded: false }));
}

describe('AffiliateGeoAreaForm', () => {
  it('shows the full country name and writes the code', () => {
    const onChange = jest.fn();
    render(<AffiliateGeoAreaForm value="GLOBAL" onChange={onChange} />);

    openSelect();
    fireEvent.click(screen.getByRole('option', { name: 'United States of America' }));

    expect(onChange).toHaveBeenCalledWith('US');
    expect(onChange).not.toHaveBeenCalledWith('United States of America');
  });

  it('washes the selected option with accent-soft', () => {
    render(<AffiliateGeoAreaForm value="US" onChange={jest.fn()} />);
    openSelect();
    expect(screen.getByRole('option', { name: 'United States of America' }).className).toContain(
      'bg-accent-soft',
    );
  });

  it('sizes the menu to remaining viewport height instead of a short cap', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    render(<AffiliateGeoAreaForm value="GLOBAL" onChange={jest.fn()} />);
    const trigger = screen.getByRole('button', { expanded: false });
    jest.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 16,
      y: 200,
      top: 200,
      bottom: 240,
      left: 16,
      right: 400,
      width: 384,
      height: 40,
      toJSON: () => ({}),
    });
    openSelect();
    const list = screen.getByRole('listbox');
    const panel = list.parentElement;
    expect(Number.parseFloat(panel?.style.maxHeight ?? '0')).toBeGreaterThan(400);
  });
});
