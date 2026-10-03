import { describe, expect, it } from 'vitest';
import { runBackend } from '../support/backend.js';

describe('ESPN proxy failure handling', () => {
  it.each(['timeout', '429', '500', 'malformed'])('serves NBA stale data after an upstream %s', (failure) => {
    const response = runBackend('failed-route', 'nba', failure, 'cached');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'cached', source: 'last-good-response' }]);
  });

  it('does not expose the upstream error body when no NBA cache entry exists', () => {
    const response = runBackend('failed-route', 'nba', '500', 'empty');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch games', games: [] });
  });

  it('returns a safe empty NFL response when no cache entry exists', () => {
    const response = runBackend('failed-route', 'nfl', 'timeout', 'empty');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch NFL games', games: [] });
  });

  it('returns a safe empty UFC response when no cache entry exists', () => {
    const response = runBackend('failed-route', 'ufc', 'malformed', 'empty');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
