import { describe, expect, it } from 'vitest';
import { runBackend } from '../support/backend.js';

describe('ESPN scoreboard proxy — UFC cards', () => {
  it('maps the UFC fight-card shape into fighters rather than teams', () => {
    const { result } = runBackend('scoreboard', 'ufc', 'ufc_standard.json');

    expect(result).toHaveLength(1);
    expect(result[0].bouts[0]).toMatchObject({
      fighter1: { name: expect.any(String) },
      fighter2: { name: expect.any(String) },
    });
    expect(result[0].bouts[0]).not.toHaveProperty('home');
  });

  it('surfaces a cancelled bout from the ESPN status', () => {
    const { result } = runBackend('scoreboard', 'ufc', 'ufc_cancelled_bout.json');

    expect(result[0].bouts[0].result).toMatch(/cancel/i);
  });

  it('surfaces a draw without declaring either fighter the winner', () => {
    const { result } = runBackend('scoreboard', 'ufc', 'ufc_draw.json');
    const bout = result[0].bouts[0];

    expect(bout.result).toMatch(/draw/i);
    expect(bout.fighter1.winner).toBe(false);
    expect(bout.fighter2.winner).toBe(false);
  });

  it.skip('handles a fighter withdrawn from a card — fixture missing: ufc_fighter_withdrawn.json');
  it.skip('handles a no contest — fixture missing: ufc_no_contest.json');
});
