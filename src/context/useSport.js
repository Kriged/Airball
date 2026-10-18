import { useContext } from 'react';
import SportContext from './SportContext';
import { getSportConfig, DEFAULT_SPORT } from '../utils/sportConfig';

/** Returns the active sport and its display configuration. */
export function useSport() {
  const ctx = useContext(SportContext);
  return ctx || { sport: DEFAULT_SPORT, config: getSportConfig(DEFAULT_SPORT) };
}
