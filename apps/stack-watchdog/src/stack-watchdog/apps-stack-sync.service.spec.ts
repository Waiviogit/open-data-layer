import {
  composeBaseArgs,
  computePullServiceNames,
  computeUpServiceNames,
  MIGRATOR_SERVICE_NAME,
  STACK_WATCHDOG_SERVICE_NAME,
  StackWatchdogSettings,
  uniqueServiceNames,
} from './apps-stack-sync.service';

describe('apps-stack-sync helpers', () => {
  const baseSettings = (): StackWatchdogSettings => ({
    enabled: true,
    deployEnv: 'staging',
    installDir: '/opt/repo',
    runtimeServiceNames: ['web', 'query-api'],
    extraPullServiceNames: [],
  });

  it('composeBaseArgs points at env file and apps compose', () => {
    const args = composeBaseArgs(baseSettings());
    expect(args).toEqual([
      '-p',
      'apps',
      '--env-file',
      '/opt/repo/.env',
      '-f',
      '/opt/repo/docker-compose.staging.apps.yml',
    ]);
  });

  it('composeBaseArgs uses production file when deployEnv is production', () => {
    const args = composeBaseArgs({
      ...baseSettings(),
      deployEnv: 'production',
    });
    expect(args).toContain('/opt/repo/docker-compose.production.apps.yml');
  });

  it('pull includes migrator and stack-watchdog after runtime services', () => {
    const pull = computePullServiceNames(baseSettings());
    expect(pull).toEqual([
      'web',
      'query-api',
      MIGRATOR_SERVICE_NAME,
      STACK_WATCHDOG_SERVICE_NAME,
    ]);
  });

  it('up includes only runtime services', () => {
    const up = computeUpServiceNames(baseSettings());
    expect(up).toEqual(['web', 'query-api']);
  });

  it('uniqueServiceNames preserves order and dedupes', () => {
    expect(uniqueServiceNames(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
