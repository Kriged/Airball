/**
 * Timezone and Localization Utility
 * Provides intelligent, automatic timezone detection (e.g. IST for India users),
 * seamless conversion of UTC ISO timestamps and US broadcast strings (EDT/EST/etc.),
 * and customizable timezone formatting across all sports (NBA, NFL, UFC).
 */

export const POPULAR_TIMEZONES = [
  { value: 'auto', label: 'Auto (Detected Local Time)', abbr: 'AUTO' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST • UTC+5:30)', abbr: 'IST', region: 'Asia / India' },
  { value: 'America/New_York', label: 'US Eastern Time (ET • UTC-4 / -5)', abbr: 'ET', region: 'North America' },
  { value: 'America/Chicago', label: 'US Central Time (CT • UTC-5 / -6)', abbr: 'CT', region: 'North America' },
  { value: 'America/Denver', label: 'US Mountain Time (MT • UTC-6 / -7)', abbr: 'MT', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PT • UTC-7 / -8)', abbr: 'PT', region: 'North America' },
  { value: 'Europe/London', label: 'United Kingdom (GMT / BST • UTC+0 / +1)', abbr: 'GMT', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (CET • UTC+1 / +2)', abbr: 'CET', region: 'Europe' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST • UTC+4)', abbr: 'GST', region: 'Middle East' },
  { value: 'Asia/Singapore', label: 'Singapore / Malaysia (SGT • UTC+8)', abbr: 'SGT', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST • UTC+9)', abbr: 'JST', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Australian Eastern (AEST / AEDT • UTC+10 / +11)', abbr: 'AEST', region: 'Oceania' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', abbr: 'UTC', region: 'Global' },
];

const TIMEZONE_STORAGE_KEY = 'app_user_timezone';

const TZ_OFFSETS = {
  EDT: -4 * 60,
  EST: -5 * 60,
  ET: -4 * 60,
  CDT: -5 * 60,
  CST: -6 * 60,
  CT: -5 * 60,
  MDT: -6 * 60,
  MST: -7 * 60,
  MT: -6 * 60,
  PDT: -7 * 60,
  PST: -8 * 60,
  PT: -7 * 60,
  UTC: 0,
  GMT: 0,
  IST: 5.5 * 60,
};

const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Detect the browser's native timezone.
 */
export function detectUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Get active user timezone (either saved preference or auto-detected).
 */
export function getUserTimezone() {
  try {
    const saved = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (saved && saved !== 'auto') {
      return saved;
    }
  } catch {
    // Fall back to detection
  }
  return detectUserTimezone();
}

/**
 * Set user timezone preference and broadcast change event.
 */
export function setUserTimezone(tz) {
  try {
    if (!tz || tz === 'auto') {
      localStorage.removeItem(TIMEZONE_STORAGE_KEY);
    } else {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
    }
  } catch {
    // Non-fatal if localStorage is restricted
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_timezone_changed', {
      detail: { timezone: getUserTimezone() }
    }));
  }
}

/**
 * Get clean human abbreviation for a timezone (e.g. 'IST', 'EDT', 'EST', 'PT', etc.)
 */
export function getTimezoneAbbr(date = new Date(), timeZone = getUserTimezone()) {
  if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta') return 'IST';
  if (timeZone === 'UTC') return 'UTC';

  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart === 'GMT+5:30' || tzPart === 'UTC+5:30' || tzPart === 'GMT+05:30') return 'IST';
    return tzPart || timeZone.split('/').pop().replace(/_/g, ' ');
  } catch {
    return 'IST';
  }
}

/**
 * Parse any date/time representation into a valid JavaScript Date.
 * Handles:
 * - ISO strings: 2026-10-23T20:00Z
 * - ESPN natural language strings: 'Fri, October 23rd at 4:00 PM EDT'
 * - UFC fight strings: 'Sat, December 12th at 5:00 PM EST'
 * - Short strings: '10/23 - 4:00 PM EDT'
 * - Time-only: '7:30 PM EDT' with referenceDate '2026-10-23'
 * - Objects: { isoDate, startTime, quarter, date, status }
 */
export function parseGameDateTime(input, referenceDate = null) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input.getTime())) return input;

  let str = '';
  let ref = referenceDate;

  if (typeof input === 'object') {
    if (input.isoDate) str = input.isoDate;
    else if (input.startTime) str = input.startTime;
    else if (input.quarter && !['FINAL', 'LIVE', 'HALFTIME', 'POSTPONED'].includes(input.status)) str = input.quarter;
    else if (input.time && input.time.includes(':') && (input.time.includes('AM') || input.time.includes('PM'))) str = input.time;
    else if (input.date) str = input.date;

    if (!ref && input.date) ref = input.date;
  } else if (typeof input === 'string') {
    str = input.trim();
  }

  if (!str) return null;

  // Ignore non-schedule status text
  const lower = str.toLowerCase();
  if (
    lower === 'final' ||
    lower.startsWith('final/') ||
    lower === 'live' ||
    lower === 'halftime' ||
    lower === 'postponed' ||
    lower === 'canceled' ||
    lower === 'scheduled' ||
    lower === 'upcoming'
  ) {
    return null;
  }

  // 1. Direct ISO string parsing (must have time part T)
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Full date format: 'Fri, October 23rd at 4:00 PM EDT' or 'Sat, December 12th at 5:00 PM EST'
  const fullMatch = str.match(
    /(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)\s*([A-Za-z]+)?/i
  );
  if (fullMatch) {
    const month = MONTH_NAMES[fullMatch[1].toLowerCase()];
    const day = parseInt(fullMatch[2], 10);
    const year = fullMatch[3]
      ? parseInt(fullMatch[3], 10)
      : (ref ? parseInt(ref.split('-')[0], 10) : new Date().getFullYear());
    let hour = parseInt(fullMatch[4], 10);
    const minute = parseInt(fullMatch[5], 10);
    const ampm = fullMatch[6].toUpperCase();
    const tz = (fullMatch[7] || 'EDT').toUpperCase();

    if (month !== undefined) {
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const offset = TZ_OFFSETS[tz] !== undefined ? TZ_OFFSETS[tz] : -4 * 60;
      return new Date(Date.UTC(year, month, day, hour, minute) - offset * 60 * 1000);
    }
  }

  // 3. Short format: '10/23 - 4:00 PM EDT' or '10/23 4:00 PM EDT'
  const shortMatch = str.match(
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-•@]?\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*([A-Za-z]+)?/i
  );
  if (shortMatch) {
    const month = parseInt(shortMatch[1], 10) - 1;
    const day = parseInt(shortMatch[2], 10);
    const year = shortMatch[3]
      ? parseInt(shortMatch[3], 10)
      : (ref ? parseInt(ref.split('-')[0], 10) : new Date().getFullYear());
    let hour = parseInt(shortMatch[4], 10);
    const minute = parseInt(shortMatch[5], 10);
    const ampm = shortMatch[6].toUpperCase();
    const tz = (shortMatch[7] || 'EDT').toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const offset = TZ_OFFSETS[tz] !== undefined ? TZ_OFFSETS[tz] : -4 * 60;
    return new Date(Date.UTC(year, month, day, hour, minute) - offset * 60 * 1000);
  }

  // 4. Time-only format: '4:00 PM EDT' or '7:30 PM' with reference date
  const timeOnly = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*([A-Za-z]+)?$/i);
  if (timeOnly && ref) {
    let hour = parseInt(timeOnly[1], 10);
    const minute = parseInt(timeOnly[2], 10);
    const ampm = timeOnly[3].toUpperCase();
    const tz = (timeOnly[4] || 'EDT').toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const [y, m, d] = ref.split('-').map(Number);
    const offset = TZ_OFFSETS[tz] !== undefined ? TZ_OFFSETS[tz] : -4 * 60;
    return new Date(Date.UTC(y, m - 1, d, hour, minute) - offset * 60 * 1000);
  }

  // 5. Date-only format: '2026-10-23'
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  return null;
}

/**
 * Format game time in user's timezone (e.g. '1:30 AM IST' or 'Sat, Oct 24 • 1:30 AM IST').
 */
export function formatGameTime(input, userTz = getUserTimezone(), options = {}) {
  // If input is an object with status FINAL or LIVE
  if (input && typeof input === 'object') {
    if (input.status === 'FINAL') return 'FINAL';
    if (input.status === 'LIVE') return input.time || input.quarter || 'LIVE';
  }

  const d = parseGameDateTime(input);
  if (!d) {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') return input.quarter || input.time || 'Upcoming';
    return '';
  }

  const tz = userTz || getUserTimezone();
  const abbr = getTimezoneAbbr(d, tz);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  if (options.includeDay) {
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);
    return `${dayStr} • ${timeStr} ${abbr}`;
  }

  return `${timeStr} ${abbr}`;
}

/**
 * Format game date in user's timezone (e.g. 'Sat, Oct 24, 2026' or 'Oct 24, 2026').
 */
export function formatGameDate(input, userTz = getUserTimezone(), options = {}) {
  const d = parseGameDateTime(input);
  if (!d) {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') return input.date || '';
    return '';
  }

  const tz = userTz || getUserTimezone();
  const formatOpts = {
    timeZone: tz,
    month: options.shortMonth === false ? 'long' : 'short',
    day: 'numeric',
  };

  if (options.includeYear !== false) {
    formatOpts.year = 'numeric';
  }

  if (options.includeWeekday) {
    formatOpts.weekday = 'short';
  }

  return new Intl.DateTimeFormat('en-US', formatOpts).format(d);
}

/**
 * Format combined date and time in user's timezone (e.g. 'Oct 24, 2026 • 1:30 AM IST').
 */
export function formatGameDateTime(input, userTz = getUserTimezone(), options = {}) {
  const d = parseGameDateTime(input);
  if (!d) {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') {
      return input.quarter || input.date || '';
    }
    return '';
  }

  const tz = userTz || getUserTimezone();
  const abbr = getTimezoneAbbr(d, tz);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: options.includeWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: options.includeYear ? 'numeric' : undefined,
  }).format(d);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${dateStr} • ${timeStr} ${abbr}`;
}

/**
 * Specially format UFC bout scheduled result strings like 'Sat, December 12th at 5:00 PM EST'.
 * If the string is a fight result ('KO/TKO', 'Decision - Unanimous'), preserves it untouched.
 */
export function formatBoutTime(boutResult, userTz = getUserTimezone()) {
  if (!boutResult || typeof boutResult !== 'string') return boutResult || '';

  // Check if string contains a time pattern like 'PM' or 'AM'
  if (!/\b(AM|PM)\b/i.test(boutResult)) {
    return boutResult;
  }

  const d = parseGameDateTime(boutResult);
  if (!d) return boutResult;

  const tz = userTz || getUserTimezone();
  const abbr = getTimezoneAbbr(d, tz);

  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${dayStr} at ${timeStr} ${abbr}`;
}

/**
 * Return an ISO date string ('YYYY-MM-DD') for a day relative to today in a given timezone.
 * offsetDays: -1 for Yesterday, 0 for Today, 1 for Tomorrow, etc.
 */
export function getDateInTimezone(offsetDays = 0, timeZone = getUserTimezone()) {
  const tz = timeZone || getUserTimezone();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(new Date()).split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    // Use midday UTC to prevent DST shifts from rolling over calendar day
    const targetUtc = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
    return formatter.format(targetUtc);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Return human-friendly date labels for Yesterday, Today, and Tomorrow in a given timezone.
 * e.g. { yesterday: 'Thu, Oct 22', today: 'Fri, Oct 23', tomorrow: 'Sat, Oct 24' }
 */
export function getDateCarouselLabels(timeZone = getUserTimezone()) {
  const tz = timeZone || getUserTimezone();
  const formatDay = (offset) => {
    try {
      const iso = getDateInTimezone(offset, tz);
      const [y, m, d] = iso.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(dateObj);
    } catch {
      return '';
    }
  };

  return {
    yesterday: formatDay(-1),
    today: formatDay(0),
    tomorrow: formatDay(1),
  };
}

