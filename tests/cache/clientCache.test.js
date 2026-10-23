// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachedFetch } from '../../src/utils/cache';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cachedFetch', () => {
  it('deduplicates simultaneous requests for the same endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'game-1', status: 'LIVE' }],
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () => cachedFetch('/api/nba/games/today', { force: true })),
    );

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual(Array.from({ length: 5 }, () => [{ id: 'game-1', status: 'LIVE' }]));
  });

  it('returns the local snapshot when the API is unavailable', async () => {
    const snapshot = [{ id: 'cached-game', status: 'FINAL' }];
    localStorage.setItem('airball_cache:/api/nba/games/today', JSON.stringify({
      timestamp: Date.now() - 120_000,
      data: snapshot,
    }));
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(cachedFetch('/api/nba/games/today', { force: true })).resolves.toEqual(snapshot);
  });
});
