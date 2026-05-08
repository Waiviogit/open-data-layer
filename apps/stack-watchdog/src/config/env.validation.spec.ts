import {
  DEFAULT_RUNTIME_SERVICE_NAMES,
  validateStackWatchdogEnv,
} from './env.validation';

describe('validateStackWatchdogEnv', () => {
  it('when disabled omits strict DEPLOY_ENV / INSTALL_DIR', () => {
    const env = validateStackWatchdogEnv({
      STACK_WATCHDOG_ENABLED: 'false',
    });
    expect(env.enabled).toBe(false);
    expect(env.deployEnv).toBe('staging');
    expect(env.runtimeServiceNames).toEqual([...DEFAULT_RUNTIME_SERVICE_NAMES]);
  });

  it('when enabled requires DEPLOY_ENV and INSTALL_DIR', () => {
    const env = validateStackWatchdogEnv({
      STACK_WATCHDOG_ENABLED: 'true',
      DEPLOY_ENV: 'production',
      INSTALL_DIR: '/var/app',
    });
    expect(env.enabled).toBe(true);
    expect(env.deployEnv).toBe('production');
    expect(env.installDir).toBe('/var/app');
  });

  it('parses CSV overrides for runtime and extra pull services', () => {
    const env = validateStackWatchdogEnv({
      STACK_WATCHDOG_ENABLED: 'true',
      DEPLOY_ENV: 'staging',
      INSTALL_DIR: '/app',
      STACK_WATCH_RUNTIME_SERVICES: ' web , query-api ',
      STACK_WATCH_EXTRA_PULL_SERVICES: 'foo',
    });
    expect(env.runtimeServiceNames).toEqual(['web', 'query-api']);
    expect(env.extraPullServiceNames).toEqual(['foo']);
  });

  it('throws when enabled and DEPLOY_ENV missing', () => {
    expect(() =>
      validateStackWatchdogEnv({
        STACK_WATCHDOG_ENABLED: 'true',
        INSTALL_DIR: '/app',
      }),
    ).toThrow();
  });
});
