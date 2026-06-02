import { WaivPowerAvgRunner } from './waiv-power-avg.runner';
import type { JobHandlerContext } from './cron-job.types';

function makeCtx(signal: AbortSignal): JobHandlerContext {
  return {
    jobName: 'waiv-power-avg',
    runId: 'run-1',
    attempt: 1,
    payload: null,
    signal,
  };
}

describe('WaivPowerAvgRunner', () => {
  function makeRunner(): WaivPowerAvgRunner {
    const runner = Object.create(WaivPowerAvgRunner.prototype) as WaivPowerAvgRunner;
    Object.assign(runner, {
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    return runner;
  }

  it('runs snapshot, compute, and prune in order', async () => {
    const runner = makeRunner();
    const calls: string[] = [];
    runner.snapshotDirtyUsers = jest.fn(async () => {
      calls.push('snapshot');
      return 2;
    });
    runner.computeRollingAverages = jest.fn(async () => {
      calls.push('compute');
      return 5;
    });
    runner.pruneHistory = jest.fn(async () => {
      calls.push('prune');
      return 1;
    });

    await runner.run(makeCtx(new AbortController().signal));

    expect(calls).toEqual(['snapshot', 'compute', 'prune']);
  });

  it('stops after snapshot when aborted', async () => {
    const runner = makeRunner();
    runner.snapshotDirtyUsers = jest.fn(async () => 0);
    runner.computeRollingAverages = jest.fn(async () => 0);
    runner.pruneHistory = jest.fn(async () => 0);

    const controller = new AbortController();
    controller.abort();

    await runner.run(makeCtx(controller.signal));

    expect(runner.snapshotDirtyUsers).toHaveBeenCalled();
    expect(runner.computeRollingAverages).not.toHaveBeenCalled();
    expect(runner.pruneHistory).not.toHaveBeenCalled();
  });

  it('stops after compute when aborted before prune', async () => {
    const runner = makeRunner();
    const controller = new AbortController();
    runner.snapshotDirtyUsers = jest.fn(async () => 1);
    runner.computeRollingAverages = jest.fn(async () => {
      controller.abort();
      return 1;
    });
    runner.pruneHistory = jest.fn(async () => 0);

    await runner.run(makeCtx(controller.signal));

    expect(runner.snapshotDirtyUsers).toHaveBeenCalled();
    expect(runner.computeRollingAverages).toHaveBeenCalled();
    expect(runner.pruneHistory).not.toHaveBeenCalled();
  });
});
