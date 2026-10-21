/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { AffiliateCodeForm } from './affiliate-code-form';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

function renderForm(
  onChange = jest.fn(),
  value: unknown = {
    scope: 'PERSONAL',
    entries: [{ code: '', chance: 100 }],
  },
) {
  render(<AffiliateCodeForm value={value} onChange={onChange} />);
  return onChange;
}

describe('AffiliateCodeForm', () => {
  it('changes context without touching codes', () => {
    const onChange = renderForm(jest.fn(), {
      scope: 'PERSONAL',
      entries: [{ code: 'A', chance: 100 }],
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'GOVERNANCE' },
    });
    expect(onChange).toHaveBeenCalledWith({
      scope: 'GOVERNANCE',
      entries: [{ code: 'A', chance: 100 }],
    });
  });

  it('adds a 0% row', () => {
    const onChange = renderForm();
    fireEvent.click(screen.getByRole('button', { name: /object_edit_affiliate_add/ }));
    expect(onChange).toHaveBeenCalledWith({
      scope: 'PERSONAL',
      entries: [
        { code: '', chance: 100 },
        { code: '', chance: 0 },
      ],
    });
  });

  it('redistributes slider chances to 100', () => {
    const onChange = renderForm(jest.fn(), {
      scope: 'PERSONAL',
      entries: [
        { code: 'A', chance: 50 },
        { code: 'B', chance: 50 },
      ],
    });
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '86' } });
    expect(onChange).toHaveBeenCalledWith({
      scope: 'PERSONAL',
      entries: [
        { code: 'A', chance: 86 },
        { code: 'B', chance: 14 },
      ],
    });
  });
});
