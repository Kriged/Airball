import { useContext } from 'react';
import TimezoneContext from './TimezoneContextValue';
import {
  getUserTimezone,
  setUserTimezone as saveUserTimezone,
  detectUserTimezone,
  getTimezoneAbbr,
  formatGameTime,
  formatGameDate,
  formatGameDateTime,
  formatBoutTime,
  POPULAR_TIMEZONES,
} from '../utils/timezone';

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    const tz = getUserTimezone();
    return {
      timezone: tz,
      timezoneAbbr: getTimezoneAbbr(new Date(), tz),
      isAuto: true,
      setTimezone: saveUserTimezone,
      formatTime: (input, options) => formatGameTime(input, tz, options),
      formatDate: (input, options) => formatGameDate(input, tz, options),
      formatDateTime: (input, options) => formatGameDateTime(input, tz, options),
      formatBout: (boutResult) => formatBoutTime(boutResult, tz),
      popularTimezones: POPULAR_TIMEZONES,
      detectedTimezone: detectUserTimezone(),
    };
  }
  return ctx;
}

export default useTimezone;
