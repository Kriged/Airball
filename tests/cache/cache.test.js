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
});
