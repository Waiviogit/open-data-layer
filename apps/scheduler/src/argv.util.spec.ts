import { isManualRunMode, parseSchedulerArgv } from './argv.util';

describe('parseSchedulerArgv', () => {
  it('parses run-job and payload', () => {
    const r = parseSchedulerArgv([
      '--run-job=noop-tick',
      '--payload={"k":1}',
    ]);
    expect(r.runJob).toBe('noop-tick');
    expect(r.payload).toEqual({ k: 1 });
  });

  it('returns nulls when absent', () => {
    const r = parseSchedulerArgv([]);
    expect(r.runJob).toBeNull();
    expect(r.payload).toBeNull();
  });

  it('rejects bad JSON payload', () => {
    expect(() => parseSchedulerArgv(['--payload=notjson'])).toThrow();
  });
});

describe('isManualRunMode', () => {
  it('is true with --run-job', () => {
    expect(isManualRunMode(['--run-job=a'])).toBe(true);
  });
  it('is false without', () => {
    expect(isManualRunMode([])).toBe(false);
  });
});
