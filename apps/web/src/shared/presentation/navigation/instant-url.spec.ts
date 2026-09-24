/**
 * @jest-environment jsdom
 */
import { pushInstantUrl, replaceInstantUrl } from '@/shared/presentation/navigation/instant-url';

describe('instant-url', () => {
  const pushState = jest.fn();
  const replaceState = jest.fn();

  beforeEach(() => {
    pushState.mockClear();
    replaceState.mockClear();
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        state: { idx: 0 },
        pushState,
        replaceState,
      },
    });
  });

  it('pushInstantUrl updates history immediately', () => {
    pushInstantUrl('/discover?type=restaurant');
    expect(pushState).toHaveBeenCalledWith({ idx: 0 }, '', '/discover?type=restaurant');
  });

  it('replaceInstantUrl updates history immediately', () => {
    replaceInstantUrl('/discover?users=1');
    expect(replaceState).toHaveBeenCalledWith({ idx: 0 }, '', '/discover?users=1');
  });

  it('pushInstantUrl does not copy a saved list offset onto the new entry', () => {
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        state: { __NA: true, __odlScrollY: 2200 },
        pushState,
        replaceState,
      },
    });

    pushInstantUrl('/object/knife');

    expect(pushState).toHaveBeenCalledWith({ __NA: true }, '', '/object/knife');
  });
});
