/** 03:00 daily in the stack-watchdog container local time (typically UTC on Linux hosts). */
export const DOCKER_IMAGE_PRUNE_CRON = '0 3 * * *';

/** Remove unused images not referenced by any container (`-a`), non-interactive (`-f`). */
export const DOCKER_IMAGE_PRUNE_ARGS = ['image', 'prune', '-a', '-f'] as const;
