import {
  getClientIpForwardHeaders,
  mergeForwardClientIpInit,
} from './client-ip-forward-headers';

describe('getClientIpForwardHeaders', () => {
  it('copies X-Forwarded-For unchanged', () => {
    const incoming = new Headers({
      'x-forwarded-for': '6.6.6.6, 1.2.3.4',
    });
    expect(getClientIpForwardHeaders(incoming)).toEqual({
      'X-Forwarded-For': '6.6.6.6, 1.2.3.4',
    });
  });

  it('emits no forward header when X-Forwarded-For is absent', () => {
    const incoming = new Headers({ 'x-real-ip': '10.0.0.1' });
    expect(getClientIpForwardHeaders(incoming)).toEqual({});
  });
});

describe('mergeForwardClientIpInit', () => {
  it('does not inject X-Forwarded-For when forwardClientIp is omitted', () => {
    const init = mergeForwardClientIpInit(
      { headers: { Accept: 'application/json' } },
      undefined,
      { 'X-Forwarded-For': '1.2.3.4' },
    );
    expect(new Headers(init.headers).get('x-forwarded-for')).toBeNull();
    expect(init.headers).toEqual({ Accept: 'application/json' });
  });

  it('merges X-Forwarded-For when forwardClientIp is true', () => {
    const init = mergeForwardClientIpInit(
      { headers: { Accept: 'application/json' } },
      true,
      { 'X-Forwarded-For': '1.2.3.4' },
    );
    expect(new Headers(init.headers).get('x-forwarded-for')).toBe('1.2.3.4');
  });
});
