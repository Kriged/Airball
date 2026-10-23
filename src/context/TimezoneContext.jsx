import { useState, useEffect, useMemo, useCallback } from 'react';
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
  getDateInTimezone,
  getDateCarouselLabels,
  POPULAR_TIMEZONES,
} from '../utils/timezone';

export function TimezoneProvider({ children }) {
  const [timezone, setTimezoneState] = useState(() => getUserTimezone());
  const [isAuto, setIsAuto] = useState(() => {
    try {
      const saved = localStorage.getItem('app_user_timezone');
      return !saved || saved === 'auto';
    } catch {
      return true;
    }
  });

  // Keep state synced across tabs / components
  useEffect(() => {
    const handleTimezoneChange = (e) => {
      const newTz = e.detail?.timezone || getUserTimezone();
      setTimezoneState(newTz);
      try {
        const saved = localStorage.getItem('app_user_timezone');
        setIsAuto(!saved || saved === 'auto');
      } catch {
        // Fallback
      }
    };

    window.addEventListener('app_timezone_changed', handleTimezoneChange);
    return () => window.removeEventListener('app_timezone_changed', handleTimezoneChange);
  }, []);

  const setTimezone = useCallback((newTz) => {
    saveUserTimezone(newTz);
    setTimezoneState(getUserTimezone());
    setIsAuto(!newTz || newTz === 'auto');
  }, []);

  const timezoneAbbr = useMemo(() => getTimezoneAbbr(new Date(), timezone), [timezone]);

  const formatTime = useCallback(
    (input, options) => formatGameTime(input, timezone, options),
    [timezone]
  );

  const formatDate = useCallback(
    (input, options) => formatGameDate(input, timezone, options),
    [timezone]
  );

  const formatDateTime = useCallback(
    (input, options) => formatGameDateTime(input, timezone, options),
    [timezone]
  );

  const formatBout = useCallback(
    (boutResult) => formatBoutTime(boutResult, timezone),
    [timezone]
  );

  const dateCarouselLabels = useMemo(() => getDateCarouselLabels(timezone), [timezone]);

  const getDateForFilter = useCallback(
    (offsetDays) => getDateInTimezone(offsetDays, timezone),
    [timezone]
  );

  const value = useMemo(
    () => ({
      timezone,
      timezoneAbbr,
      isAuto,
      setTimezone,
      formatTime,
      formatDate,
      formatDateTime,
      formatBout,
      dateCarouselLabels,
      getDateForFilter,
      getDateInTimezone: (offset) => getDateInTimezone(offset, timezone),
      popularTimezones: POPULAR_TIMEZONES,
      detectedTimezone: detectUserTimezone(),
    }),
    [
      timezone,
      timezoneAbbr,
      isAuto,
      setTimezone,
      formatTime,
      formatDate,
      formatDateTime,
      formatBout,
      dateCarouselLabels,
      getDateForFilter,
    ]
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export { TimezoneContext };
