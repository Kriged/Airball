import { describe, expect, it } from 'vitest';
import { runBackend } from '../support/backend.js';

describe('ESPN scoreboard proxy — NBA', () => {
  it('returns an empty list for an off-day scoreboard', () => {
    const { result, calls } = runBackend('scoreboard', 'nba', 'nba_empty.json');

    expect(result).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/basketball/nba/scoreboard');
  });

  it('normalizes absent scores and clock on a scheduled game', () => {
    const { result } = runBackend('scoreboard', 'nba', 'nba_missing_data.json');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ homeScore: 0, awayScore: 0, status: 'UPCOMING', time: 'Upcoming' });
  });

  it.each([
    ['nba_scheduled.json', 'UPCOMING', 'Upcoming'],
    ['nba_live.json', 'LIVE', '0.0'],
    ['nba_halftime.json', 'LIVE', '0.0'],
    ['nba_final.json', 'FINAL', '00:00'],
    ['nba_postponed.json', 'POSTPONED', 'Upcoming'],
    ['nba_delayed.json', 'DELAYED', 'Upcoming'],
  ])('maps %s to %s', (fixture, expectedStatus, expectedTime) => {
    const { result } = runBackend('scoreboard', 'nba', fixture);

    expect(result[0].status).toBe(expectedStatus);
    expect(result[0].time).toBe(expectedTime);
  });

  it('preserves NBA overtime detail and its display clock', () => {
    const { result } = runBackend('scoreboard', 'nba', 'nba_overtime.json');

    expect(result[0]).toMatchObject({ status: 'LIVE', quarter: 'OT', time: '0.0' });
  });
});

describe('ESPN scoreboard proxy — NFL', () => {
  it('keeps regulation period and clock semantics', () => {
    const { result } = runBackend('scoreboard', 'nfl', 'nfl_live_regulation.json');
    const game = result.find((item) => item.id === '401872964');

    expect(game).toMatchObject({ status: 'LIVE', quarter: '2nd Quarter', time: '12:00' });
  });

  it('keeps NFL overtime period and clock semantics', () => {
    const { result } = runBackend('scoreboard', 'nfl', 'nfl_live_ot.json');
    const game = result.find((item) => item.id === '401872964');

    expect(game).toMatchObject({ status: 'LIVE', quarter: 'Overtime', time: '05:00' });
  });
});
