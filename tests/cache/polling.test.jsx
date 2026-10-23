// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSportPolling } from '../../src/utils/polling';

function PollingProbe({ fetchFn }) {
  useSportPolling(fetchFn, { sport: 'nba' });
  return null;
}

describe('useSportPolling', () => {
  it('does not poll while the document is hidden', async () => {
    vi.useFakeTimers();
    const originalVisibility = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const fetchFn = vi.fn().mockResolvedValue([]);

    render(<PollingProbe fetchFn={fetchFn} />);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(901_000);
    });

    expect(fetchFn).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibility });
    vi.useRealTimers();
  });
});
