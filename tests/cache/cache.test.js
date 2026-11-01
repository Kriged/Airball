import { describe, expect, it } from 'vitest';
import { runBackend } from '../support/backend.js';

describe('proxy cache', () => {
  it('serves fresh data from cache within its TTL', () => {
    const { calls, results } = runBackend('cache', 'fresh');

    expect(calls).toBe(1);
    expect(results).toEqual([{ call: 1 }, { call: 1 }]);
  });

  it('refetches once data has passed its hard expiry', () => {
    const { calls, results } = runBackend('cache', 'expired');

    expect(calls).toBe(2);
    expect(results).toEqual([{ call: 1 }, { call: 2 }]);
  });

  it('coalesces 50 simultaneous cold-cache requests into one upstream call', () => {
    const { calls, results } = runBackend('cache', 'concurrent');

    expect(calls).toBe(1);
    expect(results).toHaveLength(50);
    expect(results).toEqual(Array.from({ length: 50 }, () => ({ call: 1 })));
  });

  it('triggers a background refresh when stale data is served (SWR)', () => {
    const { calls, results } = runBackend('cache', 'stale_triggers_refresh');

    // Call 1: cold-cache miss, computes synchronously → {call: 1}
    // Call 2: data is stale, returns stale immediately, kicks off bg refresh → {call: 1}
    // Call 3: after bg refresh completes, sees updated value → {call: 2}
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ call: 1 });
    // Second call returns stale value immediately (SWR behavior)
    expect(results[1]).toEqual({ call: 1 });
    // Third call returns the refreshed value
    expect(results[2]).toEqual({ call: 2 });
  });
});
