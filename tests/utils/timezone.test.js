// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseGameDateTime,
  formatGameTime,
  formatGameDate,
  formatGameDateTime,
  formatBoutTime,
  getTimezoneAbbr,
  getUserTimezone,
  setUserTimezone,
  getDateInTimezone,
  getDateCarouselLabels,
} from '../../src/utils/timezone';

describe('Timezone & Localization Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('parseGameDateTime', () => {
    it('parses full ISO 8601 UTC timestamp', () => {
      const d = parseGameDateTime('2026-10-23T20:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d.toISOString()).toBe('2026-10-23T20:00:00.000Z');
    });

    it('parses ESPN natural language EDT broadcast string', () => {
      const d = parseGameDateTime('Fri, October 23rd at 4:00 PM EDT', '2026-10-23');
      expect(d).toBeInstanceOf(Date);
      // 4:00 PM EDT = 20:00 UTC
      expect(d.toISOString()).toBe('2026-10-23T20:00:00.000Z');
    });

    it('parses UFC natural language EST broadcast string', () => {
      const d = parseGameDateTime('Sat, December 12th at 5:00 PM EST', '2026-12-12');
      expect(d).toBeInstanceOf(Date);
      // 5:00 PM EST = 22:00 UTC
      expect(d.toISOString()).toBe('2026-12-12T22:00:00.000Z');
    });

    it('parses short date format with time', () => {
      const d = parseGameDateTime('10/23 - 4:00 PM EDT', '2026-10-23');
      expect(d).toBeInstanceOf(Date);
      expect(d.toISOString()).toBe('2026-10-23T20:00:00.000Z');
    });

    it('parses game objects with isoDate', () => {
      const game = {
        id: '123',
        isoDate: '2026-10-23T20:00Z',
        quarter: '4:00 PM EDT',
        status: 'UPCOMING',
      };
      const d = parseGameDateTime(game);
      expect(d).toBeInstanceOf(Date);
      expect(d.toISOString()).toBe('2026-10-23T20:00:00.000Z');
    });

    it('returns null for in-game or completed statuses', () => {
      expect(parseGameDateTime('FINAL')).toBeNull();
      expect(parseGameDateTime('Final/OT')).toBeNull();
      expect(parseGameDateTime('LIVE')).toBeNull();
      expect(parseGameDateTime('Decision - Unanimous')).toBeNull();
      expect(parseGameDateTime('KO/TKO')).toBeNull();
    });
  });

  describe('Indian Standard Time (IST) formatting', () => {
    const testDate = new Date('2026-10-23T20:00:00.000Z');
    const istTz = 'Asia/Kolkata';

    it('formats 8:00 PM EDT as 1:30 AM IST next day', () => {
      const formattedTime = formatGameTime(testDate, istTz);
      expect(formattedTime).toContain('1:30');
      expect(formattedTime).toContain('AM');
      expect(formattedTime).toContain('IST');
    });

    it('formats date shifted to next day for IST', () => {
      const formattedDate = formatGameDate(testDate, istTz, { includeWeekday: true });
      expect(formattedDate).toContain('Oct 24');
      expect(formattedDate).toContain('Sat');
    });

    it('formats combined date and time for IST', () => {
      const combined = formatGameDateTime(testDate, istTz, { includeWeekday: true });
      expect(combined).toContain('Sat');
      expect(combined).toContain('Oct 24');
      expect(combined).toContain('1:30 AM');
      expect(combined).toContain('IST');
    });

    it('converts UFC bout 5:00 PM EST to 3:30 AM IST next day', () => {
      const ufcBout = 'Sat, December 12th at 5:00 PM EST';
      const formatted = formatBoutTime(ufcBout, istTz);
      expect(formatted).toContain('Sun');
      expect(formatted).toContain('Dec 13');
      expect(formatted).toContain('3:30 AM');
      expect(formatted).toContain('IST');
    });

    it('leaves UFC fight results like Decision untouched', () => {
      expect(formatBoutTime('Decision - Unanimous', istTz)).toBe('Decision - Unanimous');
      expect(formatBoutTime('KO/TKO Round 2 3:14', istTz)).toBe('KO/TKO Round 2 3:14');
    });
  });

  describe('Timezone selection & persistence', () => {
    it('saves user timezone in localStorage and retrieves it', () => {
      setUserTimezone('America/New_York');
      expect(getUserTimezone()).toBe('America/New_York');

      setUserTimezone('Asia/Kolkata');
      expect(getUserTimezone()).toBe('Asia/Kolkata');
    });

    it('returns IST abbreviation for Asia/Kolkata', () => {
      expect(getTimezoneAbbr(new Date(), 'Asia/Kolkata')).toBe('IST');
    });
  });

  describe('Timezone date carousel helpers', () => {
    it('computes ISO dates for today, yesterday, and tomorrow in specified timezone', () => {
      const today = getDateInTimezone(0, 'Asia/Kolkata');
      const yesterday = getDateInTimezone(-1, 'Asia/Kolkata');
      const tomorrow = getDateInTimezone(1, 'Asia/Kolkata');

      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(yesterday).not.toBe(today);
      expect(tomorrow).not.toBe(today);
    });

    it('generates carousel labels with weekday and short month', () => {
      const labels = getDateCarouselLabels('Asia/Kolkata');
      expect(labels).toHaveProperty('yesterday');
      expect(labels).toHaveProperty('today');
      expect(labels).toHaveProperty('tomorrow');
      expect(labels.today.length).toBeGreaterThan(0);
      expect(labels.yesterday.length).toBeGreaterThan(0);
      expect(labels.tomorrow.length).toBeGreaterThan(0);
    });
  });
});

