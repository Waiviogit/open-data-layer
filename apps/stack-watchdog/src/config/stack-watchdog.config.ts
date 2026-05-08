import { validateStackWatchdogEnv } from './env.validation';

export default () => {
  const env = validateStackWatchdogEnv(
    process.env as unknown as Record<string, unknown>,
  );
  return {
    stackWatchdog: {
      enabled: env.enabled,
      deployEnv: env.deployEnv,
      installDir: env.installDir,
      runtimeServiceNames: env.runtimeServiceNames,
      extraPullServiceNames: env.extraPullServiceNames,
    },
  };
};
