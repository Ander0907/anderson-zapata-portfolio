import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { ShutdownProbe, ShutdownProbeModule } from '../support/shutdown-probe.module.js';

describe('Graceful shutdown (B5, ADR-006)', () => {
  const baseline = process.listeners('SIGTERM');

  beforeEach(() => {
    ShutdownProbe.signals.length = 0;
  });

  afterEach(() => {
    for (const listener of process.listeners('SIGTERM')) {
      if (!baseline.includes(listener)) process.removeListener('SIGTERM', listener);
    }
    vi.restoreAllMocks();
  });

  it('runs onApplicationShutdown with SIGTERM and then re-raises the signal', async () => {
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    await createTestApp({ fixtures: [ShutdownProbeModule] });
    const added = process.listeners('SIGTERM').filter((l) => !baseline.includes(l));
    expect(added.length).toBeGreaterThan(0);

    // Invoke only the listeners the app registered; the worker's own handlers stay untouched.
    for (const listener of added) (listener as (signal: string) => void)('SIGTERM');

    await vi.waitFor(() => {
      expect(kill).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    });
    expect(ShutdownProbe.signals).toEqual(['SIGTERM']);
  });
});
