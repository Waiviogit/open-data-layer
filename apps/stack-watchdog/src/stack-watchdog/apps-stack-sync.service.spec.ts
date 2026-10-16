import {
  composeBaseArgs,
  composeProfilesIncludeGeoip,
  computePullServiceNames,
  computeUpServiceNames,
  GEOIPUPDATE_SERVICE_NAME,
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

  it('does not add geoipupdate when COMPOSE_PROFILES omits geoip', () => {
    expect(computePullServiceNames(baseSettings(), 'tools')).not.toContain(
      GEOIPUPDATE_SERVICE_NAME,
    );
    expect(computeUpServiceNames(baseSettings(), '')).not.toContain(
      GEOIPUPDATE_SERVICE_NAME,
    );
  });

  it('appends geoipupdate to pull and up when COMPOSE_PROFILES includes geoip', () => {
    expect(computePullServiceNames(baseSettings(), 'geoip,tools')).toEqual([
      'web',
      'query-api',
      MIGRATOR_SERVICE_NAME,
      STACK_WATCHDOG_SERVICE_NAME,
      GEOIPUPDATE_SERVICE_NAME,
    ]);
    expect(computeUpServiceNames(baseSettings(), ' tools, geoip ')).toEqual([
      'web',
      'query-api',
      GEOIPUPDATE_SERVICE_NAME,
    ]);
  });

  it('composeProfilesIncludeGeoip matches a comma-separated profile token', () => {
    expect(composeProfilesIncludeGeoip(undefined)).toBe(false);
    expect(composeProfilesIncludeGeoip('geoiptools')).toBe(false);
    expect(composeProfilesIncludeGeoip('geoip')).toBe(true);
  });

  it('uniqueServiceNames preserves order and dedupes', () => {
    expect(uniqueServiceNames(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
